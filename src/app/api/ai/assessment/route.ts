import { generateAssessment } from "@/lib/assessment-generation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { skill?: unknown; difficulty?: unknown; count?: unknown; previousQuestionHashes?: unknown };
    const skill = typeof body.skill === "string" ? body.skill : "javascript";
    const difficulty = body.difficulty === "beginner" || body.difficulty === "advanced" ? body.difficulty : "intermediate";
    const count = typeof body.count === "number" ? Math.min(8, Math.max(1, Math.floor(body.count))) : 8;
    const previousQuestionHashes = Array.isArray(body.previousQuestionHashes) ? body.previousQuestionHashes.filter((value): value is string => typeof value === "string") : [];
    const assessment = await generateAssessment({ skill, difficulty, count, previousQuestionHashes });
    return Response.json({
      success: true,
      ...assessment,
      questions: assessment.questions.map((question) => ({
        id: question.id,
        type: question.type,
        skill: question.skill,
        difficulty: question.difficulty,
        question: question.question,
        options: question.options,
        topic: question.topic,
      })),
    });
  } catch {
    return Response.json({ success: false, error: { code: "AI_ASSESSMENT_FAILED", message: "Assessment generation failed. Please use the verified fallback bank." } }, { status: 500 });
  }
}
