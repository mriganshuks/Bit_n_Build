import { NextResponse } from "next/server";
import { submitAttempt } from "@/lib/assessment-engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assessmentId?: unknown;
      answers?: unknown;
      codingSubmission?: unknown;
      timeout?: unknown;
    };

    if (typeof body.assessmentId !== "string" || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
      return Response.json({ success: false, error: { code: "INVALID_INPUT", message: "Assessment ID and answers are required." } }, { status: 400 });
    }

    const result = submitAttempt({
      id: body.assessmentId,
      answers: body.answers as Record<string, string>,
      codingSubmission: typeof body.codingSubmission === "string" ? body.codingSubmission : undefined,
      timeout: body.timeout === true,
    });

    const response = NextResponse.json({ success: true, result });
    response.cookies.set("pramaan_javascript_percentage", String(result.mcqPercentage), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("pramaan_javascript_status", result.verificationStatus, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("pramaan_assessment_integrity", String(result.integrityScore), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("pramaan_assessment_risk", result.riskLevel, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit assessment.";
    const status = message.includes("not found") ? 404 : 400;
    return Response.json({ success: false, error: { code: "ASSESSMENT_SUBMIT_FAILED", message } }, { status });
  }
}
