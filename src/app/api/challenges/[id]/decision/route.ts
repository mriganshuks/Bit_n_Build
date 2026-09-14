import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { decideCandidateChallenge } from "@/lib/team-service";

const schema = z.object({ decision: z.enum(["ACCEPT", "REJECT"]) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; const { decision } = schema.parse(await readJson(request)); return Response.json({ challenge: await decideCandidateChallenge(id, await requireCurrentProfileId(), decision) }); } catch (error) { return errorResponse(error); }
}
