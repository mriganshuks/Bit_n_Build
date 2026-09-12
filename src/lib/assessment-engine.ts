import { randomUUID } from "node:crypto";
import { generateAssessment } from "@/lib/assessment-generation";
import { calculateIntegrityScore, calculateMcqScore, classifyRisk, getVerificationStatus } from "@/lib/assessment-scoring";
import { createIntegrityEvent } from "@/lib/assessment-integrity";
import type { AssessmentResult, AssessmentState, Difficulty, IntegrityEvent, MCQQuestion, PublicMCQQuestion, CodingProblem } from "@/lib/assessment-types";
import { ASSESSMENT_DURATION_SECONDS } from "@/lib/assessment-types";

type Attempt = {
  id: string;
  skill: string;
  difficulty: Difficulty;
  state: AssessmentState;
  questions: MCQQuestion[];
  codingProblem: CodingProblem;
  startedAt: string;
  expiresAt: string;
  generatedBy: "gemini" | "fallback";
  notice?: string;
  answers: Record<string, string>;
  codingSubmission?: string;
  events: IntegrityEvent[];
  violationCount: number;
  result?: AssessmentResult;
};

const CANCELLATION_VIOLATION_LIMIT = 3;
const violationTypes = new Set<IntegrityEvent["type"]>([
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "PASTE_ATTEMPT",
  "CONTEXT_MENU",
  "DEVTOOLS_SIGNAL",
  "CAMERA_DISABLED",
  "CAMERA_UNAVAILABLE",
  "MICROPHONE_DISABLED",
  "MIC_UNAVAILABLE",
]);

const attempts = new Map<string, Attempt>();

function publicQuestions(questions: MCQQuestion[]): PublicMCQQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    type: question.type,
    skill: question.skill,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
    topic: question.topic,
  }));
}

function publicAttempt(attempt: Attempt) {
  return {
    assessmentId: attempt.id,
    skill: attempt.skill,
    difficulty: attempt.difficulty,
    state: attempt.state,
    questions: publicQuestions(attempt.questions),
    codingProblem: attempt.codingProblem,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    generatedBy: attempt.generatedBy,
    notice: attempt.notice,
    answers: attempt.answers,
    result: attempt.result,
  };
}

export async function createAttempt(input: { skill: string; difficulty?: Difficulty }) {
  const difficulty = input.difficulty ?? "intermediate";
  const generated = await generateAssessment({ skill: input.skill, difficulty, count: 8 });
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_SECONDS * 1000);
  const attempt: Attempt = {
    id: randomUUID(),
    skill: input.skill.trim().toLowerCase(),
    difficulty,
    state: "IN_PROGRESS",
    questions: generated.questions,
    codingProblem: generated.codingProblem,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    generatedBy: generated.generatedBy,
    notice: generated.notice,
    answers: {},
    events: [],
    violationCount: 0,
  };
  attempts.set(attempt.id, attempt);
  return publicAttempt(attempt);
}

export function getAttempt(id: string) {
  const attempt = attempts.get(id);
  return attempt ? publicAttempt(attempt) : null;
}

function getStoredAttempt(id: string) {
  return attempts.get(id) ?? null;
}

export function addIntegrityEvents(id: string, inputs: Array<Parameters<typeof createIntegrityEvent>[0]>) {
  const attempt = getStoredAttempt(id);
  if (!attempt) throw new Error("Assessment attempt not found.");
  if (attempt.state === "EVALUATED" || attempt.state === "EXPIRED") throw new Error("This assessment is no longer active.");
  const events = inputs.map(createIntegrityEvent);
  attempt.events.push(...events);
  attempt.violationCount += events.filter((event) => violationTypes.has(event.type)).length;
  const integrityScore = calculateIntegrityScore(attempt.events);
  const riskLevel = classifyRisk(integrityScore, attempt.events);

  if (attempt.violationCount >= CANCELLATION_VIOLATION_LIMIT) {
    attempt.state = "FAILED";
    attempt.result = {
      assessmentId: attempt.id,
      skill: attempt.skill,
      state: "FAILED",
      mcqScore: 0,
      mcqTotal: attempt.questions.length,
      mcqPercentage: 0,
      codingScore: null,
      integrityScore,
      riskLevel: "HIGH_RISK",
      verificationStatus: "not_verified",
      completedAt: new Date().toISOString(),
      signals: attempt.events,
      violationCount: attempt.violationCount,
      cancellationReason: "Assessment cancelled after three integrity violations.",
    };
  }

  return {
    events: attempt.events,
    integrityScore,
    riskLevel,
    violationCount: attempt.violationCount,
    cancelled: attempt.state === "FAILED",
    result: attempt.result,
  };
}

export function submitAttempt(input: { id: string; answers: Record<string, string>; codingSubmission?: string; timeout?: boolean }) {
  const attempt = getStoredAttempt(input.id);
  if (!attempt) throw new Error("Assessment attempt not found.");
  if (["EVALUATED", "SUBMITTED", "EXPIRED", "FAILED"].includes(attempt.state)) throw new Error("This assessment has already been completed.");

  const expired = input.timeout || Date.now() > new Date(attempt.expiresAt).getTime();
  const correctAnswers = Object.fromEntries(attempt.questions.map((question) => [question.id, question.correctOption]));
  for (const question of attempt.questions) {
    const answer = input.answers[question.id];
    if (typeof answer !== "string" || !question.options.some((option) => option.id === answer)) throw new Error("Some submitted answers are invalid.");
  }

  const mcq = calculateMcqScore(input.answers, correctAnswers);
  if (expired) attempt.events.push(createIntegrityEvent({ type: "ASSESSMENT_TIMEOUT", severity: "HIGH" }));
  attempt.answers = input.answers;
  attempt.codingSubmission = input.codingSubmission;
  attempt.state = expired ? "EXPIRED" : "EVALUATED";
  const integrityScore = calculateIntegrityScore(attempt.events);
  const riskLevel = classifyRisk(integrityScore, attempt.events);
  const result: AssessmentResult = {
    assessmentId: attempt.id,
    skill: attempt.skill,
    state: attempt.state,
    mcqScore: mcq.score,
    mcqTotal: mcq.total,
    mcqPercentage: mcq.percentage,
    codingScore: null,
    integrityScore,
    riskLevel,
    verificationStatus: getVerificationStatus(mcq.percentage),
    completedAt: new Date().toISOString(),
    signals: attempt.events,
    violationCount: attempt.violationCount,
  };
  attempt.result = result;
  return result;
}
