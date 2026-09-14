import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { listInvitations } from "@/lib/team-service";

export async function GET() {
  try { await connectToDatabase(); return Response.json({ invitations: await listInvitations(await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}
