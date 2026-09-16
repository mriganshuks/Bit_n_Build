import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || {
  conn: null,
  promise: null,
};

global.mongoose = cached;

let legacyProfileIndexMigration: Promise<void> | null = null;
let legacyProfileIndexMigrationDone = false;

async function removeLegacyProfileIndex() {
  if (legacyProfileIndexMigrationDone) return;

  if (!legacyProfileIndexMigration) {
    const collection = mongoose.connection.db?.collection("users");
    legacyProfileIndexMigration = collection
      ? Promise.all(
          ["username_1", "phone_1", "provider_1_providerAccountId_1"].map((name) =>
            collection.dropIndex(name).catch((error: { code?: number }) => {
              // Codes 26 and 27 mean a fresh collection or an already-migrated one.
              if (error.code !== 26 && error.code !== 27) throw error;
            })
          )
        ).then(() => {
          legacyProfileIndexMigrationDone = true;
        })
      : Promise.resolve().then(() => {
          legacyProfileIndexMigrationDone = true;
        });
  }

  try {
    await legacyProfileIndexMigration;
  } catch (error) {
    legacyProfileIndexMigration = null;
    throw error;
  }
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local"
    );
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    if (!legacyProfileIndexMigrationDone) {
      await removeLegacyProfileIndex();
    }
    return cached.conn;
  }

  cached.conn = null;

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const connection = await openConnection();
      if (!legacyProfileIndexMigrationDone) {
        await removeLegacyProfileIndex();
      }
      return connection;
    } catch (error) {
      lastError = error;
      cached.conn = null;
      cached.promise = null;
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => undefined);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError;
}

async function openConnection() {
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI as string, {
        family: 4,
        tls: true,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;

  return cached.conn;
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>) {
  await connectToDatabase();

  try {
    return await operation();
  } catch {
    cached.conn = null;
    cached.promise = null;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => undefined);
    }

    await connectToDatabase();
    return operation();
  }
}
