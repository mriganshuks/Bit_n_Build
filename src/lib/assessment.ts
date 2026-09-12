import { randomUUID } from "node:crypto";

type AssessmentQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
};

type PublicQuestion = Omit<AssessmentQuestion, "correctAnswer">;

type AssessmentRecord = {
  id: string;
  skill: string;
  questions: AssessmentQuestion[];
  answers?: Record<string, number>;
  score?: number;
  percentage?: number;
  status?: "verified" | "partially_verified" | "not_verified";
  completedAt?: string;
};

const questionBank: Record<string, AssessmentQuestion[]> = {
  javascript: [
    {
      id: "javascript-1",
      question: "Which keyword creates a block-scoped variable?",
      options: ["var", "let", "function", "define"],
      correctAnswer: 1,
    },
    {
      id: "javascript-2",
      question: "What does Array.map() return?",
      options: [
        "The original array only",
        "A new array from transformed values",
        "A boolean value",
        "The first matching item",
      ],
      correctAnswer: 1,
    },
    {
      id: "javascript-3",
      question: "Which value represents an intentional absence of an object value?",
      options: ["undefined", "NaN", "null", "false"],
      correctAnswer: 2,
    },
    {
      id: "javascript-4",
      question: "What does a Promise represent?",
      options: [
        "A CSS style rule",
        "The eventual result of an asynchronous operation",
        "A synchronous loop",
        "A database table",
      ],
      correctAnswer: 1,
    },
    {
      id: "javascript-5",
      question: "Which method adds an item to the end of an array?",
      options: ["shift", "slice", "push", "concat"],
      correctAnswer: 2,
    },
  ],
};

const assessments = new Map<string, AssessmentRecord>();

export function normalizeSkill(skill: string) {
  return skill.trim().toLowerCase();
}

export function isSupportedSkill(skill: string) {
  return normalizeSkill(skill) in questionBank;
}

export function getPublicQuestions(skill: string): PublicQuestion[] {
  const questions = questionBank[normalizeSkill(skill)];

  if (!questions) {
    throw new Error("This skill does not have an assessment yet.");
  }

  return questions.map(({ id, question, options }) => ({
    id,
    question,
    options,
  }));
}

export function createAssessment(skill: string) {
  const normalizedSkill = normalizeSkill(skill);
  const questions = questionBank[normalizedSkill];

  if (!questions) {
    throw new Error("This skill does not have an assessment yet.");
  }

  const assessment: AssessmentRecord = {
    id: randomUUID(),
    skill: normalizedSkill,
    questions,
  };

  assessments.set(assessment.id, assessment);

  return assessment;
}

export function getAssessment(id: string) {
  return assessments.get(id) ?? null;
}

export function evaluateAssessment(
  id: string,
  answers: Record<string, number>
) {
  const assessment = assessments.get(id);

  if (!assessment) {
    throw new Error("Assessment not found.");
  }

  if (assessment.completedAt) {
    throw new Error("This assessment has already been completed.");
  }

  for (const question of assessment.questions) {
    const answer = answers[question.id];

    if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) {
      throw new Error("Some submitted answers are invalid.");
    }
  }

  const score = assessment.questions.reduce(
    (total, question) =>
      total + (answers[question.id] === question.correctAnswer ? 1 : 0),
    0
  );
  const percentage = Math.round((score / assessment.questions.length) * 100);
  const status =
    percentage >= 80
      ? "verified"
      : percentage >= 60
        ? "partially_verified"
        : "not_verified";

  assessment.answers = answers;
  assessment.score = score;
  assessment.percentage = percentage;
  assessment.status = status;
  assessment.completedAt = new Date().toISOString();

  return assessment;
}

export function toSafeResult(assessment: AssessmentRecord) {
  return {
    assessmentId: assessment.id,
    skill: assessment.skill,
    score: assessment.score ?? 0,
    totalQuestions: assessment.questions.length,
    percentage: assessment.percentage ?? 0,
    status: assessment.status ?? "not_verified",
    completedAt: assessment.completedAt ?? null,
  };
}
