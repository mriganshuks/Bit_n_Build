import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createProfile, createProfileSchema } from "@/lib/profile-service";
import { errorResponse, readJson } from "@/lib/api";
import {
  PROFILE_COOKIE,
  profileCookieOptions,
  getCurrentVerifiedFirebaseIdentity,
} from "@/lib/profile-context";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const raw = (await readJson(request)) as Record<string, unknown>;
    const verifiedIdentity = await getCurrentVerifiedFirebaseIdentity();

    // If verified via Firebase, enforce the authoritative identity
    const payload = {
      ...raw,
      ...(verifiedIdentity
        ? {
            firebaseUid: verifiedIdentity.uid,
            email: verifiedIdentity.email || raw.email,
            photoUrl: verifiedIdentity.photoUrl || raw.photoUrl || "",
          }
        : {}),
    };

    const parsed = createProfileSchema.parse(payload);
    const profile = await createProfile(parsed);
    const response = NextResponse.json({ profile }, { status: 201 });
    response.cookies.set(PROFILE_COOKIE, profile.id, profileCookieOptions());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
