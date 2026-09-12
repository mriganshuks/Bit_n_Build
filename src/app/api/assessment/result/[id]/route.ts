import { getAssessment, toSafeResult } from "@/lib/assessment";

type ResultRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: ResultRouteContext
) {
  const { id } = await params;
  const assessment = getAssessment(id);

  if (!assessment) {
    return Response.json({ error: "Assessment not found." }, { status: 404 });
  }

  if (!assessment.completedAt) {
    return Response.json(
      { error: "This assessment has not been completed." },
      { status: 400 }
    );
  }

  return Response.json(toSafeResult(assessment));
}
