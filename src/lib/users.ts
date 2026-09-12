import { User, type UserDocument } from "@/models/User";
import { connectToDatabase, withDatabaseRetry } from "@/lib/mongodb";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

type GoogleIdentityInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  providerAccountId: string;
};

type ProfileInput = {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  password: string;
};

type ProfileConflictInput = Pick<ProfileInput, "username" | "phone" | "email">;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash?: string | null
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  const [salt, storedKey] = passwordHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKeyBuffer = Buffer.from(storedKey, "hex");

  return (
    storedKeyBuffer.length === derivedKey.length &&
    timingSafeEqual(storedKeyBuffer, derivedKey)
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function findProfileConflict(input: ProfileConflictInput) {
  const username = input.username.trim().toLowerCase();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const user = await withDatabaseRetry(() =>
    User.findOne({
      $or: [{ email }, { username }, { phone }],
    })
      .select("email username phone")
      .exec()
  );

  if (!user) {
    return null;
  }

  if (user.username === username) {
    return "That username is already registered.";
  }

  if (user.phone === phone) {
    return "That phone number is already registered.";
  }

  return "That email address is already registered.";
}

export async function findOrCreateUserFromProvider(
  input: GoogleIdentityInput
): Promise<UserDocument> {
  await connectToDatabase();

  const email = input.email.toLowerCase().trim();

  const existingByProvider = await User.findOne({
    provider: input.provider,
    providerAccountId: input.providerAccountId,
  });

  if (existingByProvider) {
    return existingByProvider;
  }

  const existingByEmail = await User.findOne({ email });

  if (existingByEmail) {
    return existingByEmail;
  }

  try {
    return await User.create({
      email,
      name: input.name ?? undefined,
      image: input.image ?? undefined,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      profileCompleted: false,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const racedUser = await User.findOne({
      $or: [
        {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
        { email },
      ],
    });

    if (!racedUser) {
      throw error;
    }

    return racedUser;
  }
}

export async function createUserFromProfile(
  input: ProfileInput
): Promise<UserDocument> {
  await connectToDatabase();

  const profile = {
    name: input.fullName.trim(),
    username: input.username.trim().toLowerCase(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
  };

  if (
    profile.name.length < 2 ||
    !/^[a-z0-9_]{3,24}$/.test(profile.username) ||
    !/^\+?[1-9]\d{7,14}$/.test(profile.phone) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
    input.password.length < 8
  ) {
    throw new Error("Please provide valid profile details.");
  }

  const existingUser = await User.findOne({
    $or: [
      { email: profile.email },
      { username: profile.username },
      { phone: profile.phone },
    ],
  });

  if (existingUser) {
    throw new Error("Email, username, or phone number is already registered.");
  }

  return User.create({
    ...profile,
    provider: "credentials",
    providerAccountId: profile.username,
    profileCompleted: true,
    emailVerified: false,
    passwordHash: await hashPassword(input.password),
  });
}

export async function findUserForLogin(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await withDatabaseRetry(() =>
    User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
        { phone: identifier.trim() },
      ],
    }).exec()
  );

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return null;
  }

  return user;
}
