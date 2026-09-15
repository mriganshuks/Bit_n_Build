import { cookies, headers } from "next/headers";
import mongoose from "mongoose";
import { ApiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyFirebaseIdToken, type VerifiedFirebaseIdentity } from "@/lib/firebase/server";
import { User } from "@/models/User";

export const PROFILE_COOKIE = "pramaan_profile_id";
export const SESSION_TOKEN_COOKIE = "pramaan_session_token";

export async function getCurrentVerifiedFirebaseIdentity(): Promise<VerifiedFirebaseIdentity | null> {
  const reqHeaders = await headers();
  const authHeader = reqHeaders.get("authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_TOKEN_COOKIE)?.value ?? null;
  }

  if (!token) return null;

  try {
    return await verifyFirebaseIdToken(token);
  } catch (error) {
    console.warn("Firebase token verification failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getCurrentProfileId(): Promise<string | null> {
  // 1. Authoritative Firebase ID token verification
  const identity = await getCurrentVerifiedFirebaseIdentity();
  if (identity) {
    await connectToDatabase();
    let user = await User.findOne({ firebaseUid: identity.uid });
    if (!user && identity.email) {
      user = await User.findOne({ email: identity.email });
      if (user) {
        user.firebaseUid = identity.uid;
        if (identity.photoUrl && !user.photoUrl) user.photoUrl = identity.photoUrl;
        await user.save();
      }
    }
    if (user) return user._id.toString();
  }

  // 2. Fallback to pramaan_profile_id cookie in development / automated test environments only
  const cookieStore = await cookies();
  const cookieProfileId = cookieStore.get(PROFILE_COOKIE)?.value ?? null;

  if (cookieProfileId && mongoose.isValidObjectId(cookieProfileId)) {
    // In production, we do not allow impersonation via raw cookie without verified Firebase identity
    if (process.env.NODE_ENV === "production" && !identity) {
      return null;
    }

    await connectToDatabase();
    const existing = await User.findById(cookieProfileId).select("_id").lean();
    if (existing) return existing._id.toString();
  }

  return null;
}

export async function requireCurrentProfileId(): Promise<string> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    throw new ApiError("Sign in or create your profile before continuing.", 401, "AUTH_REQUIRED");
  }
  return profileId;
}

export function profileCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

