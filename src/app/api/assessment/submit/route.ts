import { evaluateAssessment, toSafeResult } from "@/lib/assessment";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assessmentId?: unknown;
      answers?: unknown;
    };

    if (
      typeof body.assessmentId !== "string" ||
      !body.answers ||
      typeof body.answers !== "object" ||
      Array.isArray(body.answers)
    ) {
      return Response.json(
        { error: "Assessment ID and answers are required." },
        { status: 400 }
      );
    }

    const result = evaluateAssessment(
      body.assessmentId,
      body.answers as Record<string, number>
    );

    const response = NextResponse.json(toSafeResult(result));
    response.cookies.set("pramaan_javascript_percentage", String(result.percentage), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("pramaan_javascript_status", result.status ?? "not_verified", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit assessment.";
    const status = message.includes("not found")
      ? 404
      : message.includes("already") || message.includes("invalid")
        ? 400
        : 500;

    return Response.json({ error: message }, { status });
  }
}
