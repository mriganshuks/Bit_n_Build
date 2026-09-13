import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";

export const PROFILE_COOKIE = "pramaan_profile_id";

export async function getCurrentProfileId() {
  return (await cookies()).get(PROFILE_COOKIE)?.value ?? null;
}

export async function requireCurrentProfileId() {
  const profileId = await getCurrentProfileId();
  if (!profileId) throw new ApiError("Create a local profile before continuing.", 401, "PROFILE_REQUIRED");
  return profileId;
}

export function profileCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 };
}
