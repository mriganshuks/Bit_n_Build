import { errorResponse } from "@/lib/api";
import {
  getCurrentUserProfile,
  getCurrentVerifiedFirebaseIdentity,
} from "@/lib/profile-context";
import { serializeProfile } from "@/lib/serializers";

export async function GET() {
  try {
    const resolved = await getCurrentUserProfile();
    if (resolved?.user) {
      return Response.json({
        authenticated: true,
        profile: serializeProfile(resolved.user),
      });
    }

    const identity = await getCurrentVerifiedFirebaseIdentity();
    if (identity) {
      return Response.json({
        authenticated: true,
        isNewUser: true,
        identity: {
          uid: identity.uid,
          email: identity.email,
          displayName: identity.displayName,
          photoUrl: identity.photoUrl,
        },
      });
    }

    return Response.json({
      authenticated: false,
      profile: null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
