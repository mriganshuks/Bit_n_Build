import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson, ApiError } from "@/lib/api";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";
import { User } from "@/models/User";
import { serializeProfile } from "@/lib/serializers";
import { PROFILE_COOKIE, SESSION_TOKEN_COOKIE, profileCookieOptions } from "@/lib/profile-context";

export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { idToken?: string };
    if (!body.idToken || typeof body.idToken !== "string") {
      throw new ApiError("Firebase idToken is required.", 400, "MISSING_TOKEN");
    }

    const identity = await verifyFirebaseIdToken(body.idToken);
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

    const cookieOpts = profileCookieOptions();

    if (user) {
      const response = NextResponse.json({
        authenticated: true,
        isNewUser: false,
        profile: serializeProfile(user),
      });
      response.cookies.set(SESSION_TOKEN_COOKIE, body.idToken, cookieOpts);
      response.cookies.set(PROFILE_COOKIE, user._id.toString(), cookieOpts);
      return response;
    }

    // Authenticated via Firebase, but needs to complete onboarding
    const response = NextResponse.json({
      authenticated: true,
      isNewUser: true,
      identity: {
        uid: identity.uid,
        email: identity.email,
        displayName: identity.displayName,
        photoUrl: identity.photoUrl,
      },
    });
    response.cookies.set(SESSION_TOKEN_COOKIE, body.idToken, cookieOpts);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
