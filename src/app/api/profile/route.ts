import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId, requireCurrentUserProfile } from "@/lib/profile-context";
import { profilePatchSchema, updateOwnProfile } from "@/lib/profile-service";
import { serializeProfile } from "@/lib/serializers";

export async function GET() {
  try {
    await connectToDatabase();
    const { user } = await requireCurrentUserProfile();
    return Response.json({ profile: serializeProfile(user) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    return Response.json({
      profile: await updateOwnProfile(
        await requireCurrentProfileId(),
        profilePatchSchema.parse(await readJson(request))
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
