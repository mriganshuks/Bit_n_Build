import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { PROFILE_COOKIE, SESSION_TOKEN_COOKIE, profileCookieOptions } from "@/lib/profile-context";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    const expiredOptions = {
      ...profileCookieOptions(),
      maxAge: 0,
    };
    response.cookies.set(SESSION_TOKEN_COOKIE, "", expiredOptions);
    response.cookies.set(PROFILE_COOKIE, "", expiredOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
