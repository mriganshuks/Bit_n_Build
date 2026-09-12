import { getAttempt } from "@/lib/assessment-engine";

type ResultRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: ResultRouteContext
) {
  const { id } = await params;
  const assessment = getAttempt(id);

  if (!assessment) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Assessment not found." } }, { status: 404 });
  }

  if (!assessment.result) {
    return Response.json({ success: false, error: { code: "NOT_COMPLETE", message: "This assessment has not been completed." } }, { status: 400 });
  }

  return Response.json({ success: true, result: assessment.result });
}
