import { createChallenge, publicChallengeQuestions } from "@/lib/challenge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { candidateId?: unknown };
    const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
    const challenge = createChallenge(candidateId);

    return Response.json({
      challengeId: challenge.id,
      candidateId: challenge.candidateId,
      questions: publicChallengeQuestions(challenge),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start challenge.";
    return Response.json({ error: message }, { status: 400 });
  }
}
