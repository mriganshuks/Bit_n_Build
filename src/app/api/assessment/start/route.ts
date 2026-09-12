import {
  createAssessment,
  getPublicQuestions,
  isSupportedSkill,
} from "@/lib/assessment";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { skill?: unknown };
    const skill = typeof body.skill === "string" ? body.skill : "";

    if (!isSupportedSkill(skill)) {
      return Response.json(
        { error: "This skill does not have an assessment yet." },
        { status: 400 }
      );
    }

    const assessment = createAssessment(skill);

    return Response.json({
      assessmentId: assessment.id,
      skill: assessment.skill,
      questions: getPublicQuestions(assessment.skill),
    });
  } catch {
    return Response.json(
      { error: "Unable to start the assessment. Please try again." },
      { status: 500 }
    );
  }
}
