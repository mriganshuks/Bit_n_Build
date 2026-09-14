import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { listCandidateChallenges } from "@/lib/team-service";

export async function GET() {
  try {
    await connectToDatabase();
    return Response.json({ challenges: await listCandidateChallenges(await requireCurrentProfileId()) });
  } catch (error) {
    return errorResponse(error);
  }
}
