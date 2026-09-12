import { addIntegrityEvents } from "@/lib/assessment-engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { assessmentId?: unknown; events?: unknown };
    if (typeof body.assessmentId !== "string" || !Array.isArray(body.events)) {
      return Response.json({ success: false, error: { code: "INVALID_INPUT", message: "Assessment ID and events are required." } }, { status: 400 });
    }
    const result = addIntegrityEvents(body.assessmentId, body.events as Parameters<typeof addIntegrityEvents>[1]);
    return Response.json({ success: true, ...result }, { status: result.cancelled ? 409 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record integrity signals.";
    return Response.json({ success: false, error: { code: "INTEGRITY_ERROR", message } }, { status: 400 });
  }
}
