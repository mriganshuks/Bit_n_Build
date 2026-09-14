import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { startSkillChallenge } from "@/lib/team-service";

const schema = z.object({ consent: z.literal(true) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; schema.parse(await readJson(request)); return Response.json({ challenge: await startSkillChallenge(id, await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}
