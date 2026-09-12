import { safeChallengeResult, submitChallenge } from "@/lib/challenge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      challengeId?: unknown;
      answers?: unknown;
    };

    if (
      typeof body.challengeId !== "string" ||
      !body.answers ||
      typeof body.answers !== "object" ||
      Array.isArray(body.answers)
    ) {
      return Response.json({ error: "Challenge ID and answers are required." }, { status: 400 });
    }

    const challenge = submitChallenge(body.challengeId, body.answers as Record<string, number>);
    return Response.json(safeChallengeResult(challenge));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit challenge.";
    return Response.json({ error: message }, { status: 400 });
  }
}
