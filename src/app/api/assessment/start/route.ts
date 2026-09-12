import { NextResponse } from "next/server";
import { createAttempt } from "@/lib/assessment-engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { skill?: unknown; difficulty?: unknown; consent?: unknown };
    const skill = typeof body.skill === "string" ? body.skill : "";

    if (body.consent !== true) {
      return Response.json({ success: false, error: { code: "CONSENT_REQUIRED", message: "Assessment integrity consent is required before starting." } }, { status: 400 });
    }
    const difficulty = body.difficulty === "beginner" || body.difficulty === "advanced" ? body.difficulty : "intermediate";
    const attempt = await createAttempt({ skill, difficulty });
    const response = NextResponse.json({ success: true, attempt });
    response.cookies.set("pramaan_assessment_attempt", attempt.assessmentId, { httpOnly: true, sameSite: "lax", path: "/" });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start the assessment.";
    return Response.json({ success: false, error: { code: "ASSESSMENT_START_FAILED", message } }, { status: 500 });
  }
}
