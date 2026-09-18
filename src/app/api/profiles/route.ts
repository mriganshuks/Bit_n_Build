import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createProfile, createProfileSchema } from "@/lib/profile-service";
import { errorResponse, readJson } from "@/lib/api";
import {
  PROFILE_COOKIE,
  profileCookieOptions,
  getCurrentVerifiedFirebaseIdentity,
} from "@/lib/profile-context";
import { getHandleValidationError } from "@/lib/handle-validation";
import { User } from "@/models/User";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle");

    if (!handle) {
      return Response.json(
        { error: { code: "INVALID_REQUEST", message: "Handle query parameter is required." } },
        { status: 400 }
      );
    }

    const validationError = getHandleValidationError(handle);
    if (validationError) {
      return Response.json(
        {
          available: false,
          error: validationError,
        },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ handle: handle.trim().toLowerCase() }).select("_id").lean();
    if (existing) {
      return Response.json(
        {
          available: false,
          error: "This public handle is already taken. Try another one.",
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        available: true,
        message: "Public handle is available.",
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

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
