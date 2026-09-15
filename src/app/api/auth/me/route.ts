import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import {
  getCurrentProfileId,
  getCurrentVerifiedFirebaseIdentity,
} from "@/lib/profile-context";
import { User } from "@/models/User";
import { serializeProfile } from "@/lib/serializers";

export async function GET() {
  try {
    const profileId = await getCurrentProfileId();
    if (profileId) {
      await connectToDatabase();
      const user = await User.findById(profileId).lean();
      if (user) {
        return Response.json({
          authenticated: true,
          profile: serializeProfile(user),
        });
      }
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
