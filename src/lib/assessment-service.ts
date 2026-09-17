import mongoose from "mongoose";
import { AssessmentAttempt } from "@/models/AssessmentAttempt";
import { IntegrityEvent } from "@/models/IntegrityEvent";
import { User } from "@/models/User";
import { ApiError } from "@/lib/api";
import { generateAssessment } from "@/lib/assessment-generation";
import { integritySummary, scoreMcq, verificationFor } from "@/lib/assessment-scoring";
import { evaluateCodeSafely } from "@/lib/safe-code-execution";
import { publicCodingProblem, publicQuestions } from "@/lib/serializers";
import { ASSESSMENT_DURATION_SECONDS, type Difficulty, type IntegrityEventType } from "@/lib/assessment-types";
import { normalizeSkillName } from "@/lib/skills";

function objectId(value: string) {
  if (!mongoose.isValidObjectId(value)) throw new ApiError("The requested record was not found.", 404, "NOT_FOUND");
  return new mongoose.Types.ObjectId(value);
}

export function publicAttempt(attempt: {
  _id: { toString(): string };
  skill: string;
  difficulty: string;
  state: string;
  questions: Array<{ id: string; prompt: string; topic: string; options: Array<{ id: string; text: string }> }>;
  codingProblem: unknown;
  startedAt: Date;
  expiresAt: Date;
  generatedBy: string;
  generationNotice?: string | null;
}) {
  return { id: attempt._id.toString(), skill: attempt.skill, difficulty: attempt.difficulty, state: attempt.state, questions: publicQuestions(attempt.questions), codingProblem: publicCodingProblem(attempt.codingProblem as Parameters<typeof publicCodingProblem>[0]), startedAt: attempt.startedAt.toISOString(), expiresAt: attempt.expiresAt.toISOString(), generatedBy: attempt.generatedBy, notice: attempt.generationNotice };
}

export async function createAssessmentAttempt(input: { profileId: string; skill: string; difficulty: Difficulty }) {
  const profileId = objectId(input.profileId);
  const profile = await User.findById(profileId).select("_id skills").lean();
  if (!profile) throw new ApiError("Create a profile before starting an assessment.", 404, "PROFILE_NOT_FOUND");
  const normalized = normalizeSkillName(input.skill);
  if (normalized.length < 1 || normalized.length > 80) throw new ApiError("Choose a valid skill.", 400, "INVALID_SKILL");
  const claimedSkill = profile.skills?.find(
    (s) => normalizeSkillName(s.normalizedName || s.name) === normalized
  );
  if (!claimedSkill) {
    throw new ApiError("You must claim this skill on your profile before starting an assessment.", 403, "SKILL_NOT_CLAIMED");
  }
  const now = new Date();
  await AssessmentAttempt.updateMany(
    { profileId, state: "IN_PROGRESS", expiresAt: { $lte: now } },
    { $set: { state: "TIMED_OUT", submittedAt: now } }
  );
  const activeAttempt = await AssessmentAttempt.exists({ profileId, state: "IN_PROGRESS", expiresAt: { $gt: now } });
  if (activeAttempt) throw new ApiError("Finish or resume your active assessment before starting another one.", 409, "ACTIVE_ASSESSMENT_EXISTS");
  const prior = await AssessmentAttempt.find({ profileId, skill: new RegExp(`^${claimedSkill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("questions.fingerprint").sort({ createdAt: -1 }).limit(5).lean();
  const previousFingerprints = prior.flatMap((attempt) => attempt.questions.map((question) => question.fingerprint));
  const generated = await generateAssessment({ skill: claimedSkill.name, difficulty: input.difficulty, count: 5, previousFingerprints });
  const startedAt = now;
  const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_SECONDS * 1000);
  const attempt = await AssessmentAttempt.create({ profileId, skill: claimedSkill.name, difficulty: input.difficulty, state: "IN_PROGRESS", startedAt, expiresAt, questions: generated.questions, codingProblem: generated.codingProblem, generatedBy: generated.generatedBy, generationNotice: generated.notice });
  return publicAttempt(attempt);
}

export async function getAssessmentAttempt(profileId: string, attemptId: string) {
  const attempt = await AssessmentAttempt.findOne({ _id: objectId(attemptId), profileId: objectId(profileId) }).lean();
  if (!attempt) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  return publicAttempt(attempt);
}

export async function getActiveAssessmentAttempt(profileId: string, skill: string) {
  const profile = await User.findById(objectId(profileId)).select("skills").lean();
  if (!profile) return null;
  const normalized = normalizeSkillName(skill);
  const claimed = profile.skills?.find(
    (s) => normalizeSkillName(s.normalizedName || s.name) === normalized
  );
  if (!claimed) return null;

  const now = new Date();
  const attempt = await AssessmentAttempt.findOne({
    profileId: objectId(profileId),
    skill: new RegExp(`^${claimed.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    state: "IN_PROGRESS",
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 }).lean();
  if (!attempt) return null;
  return publicAttempt(attempt);
}

export async function recordAssessmentIntegrity(input: { profileId: string; attemptId: string; events: Array<{ type: IntegrityEventType; severity: "LOW" | "MEDIUM" | "HIGH"; timestamp?: Date; metadata?: Record<string, string | number | boolean> }> }) {
  const targetId = objectId(input.attemptId);
  const profileObjectId = objectId(input.profileId);
  const attempt = await AssessmentAttempt.exists({ _id: targetId, profileId: profileObjectId, state: "IN_PROGRESS" });
  if (!attempt) throw new ApiError("This assessment can no longer receive integrity events.", 409, "INVALID_STATE");
  await IntegrityEvent.insertMany(input.events.map((event) => ({ targetId, targetType: "ASSESSMENT", profileId: profileObjectId, type: event.type, severity: event.severity, timestamp: event.timestamp ?? new Date(), metadata: event.metadata })), { ordered: false });
  const events = await IntegrityEvent.find({ targetId }).lean();
  return integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>);
}

export async function submitAssessmentAttempt(input: { profileId: string; attemptId: string; answers: Record<string, string>; codingSubmission: string; timeout: boolean }) {
  const profileObjectId = objectId(input.profileId);
  const attemptId = objectId(input.attemptId);
  const attempt = await AssessmentAttempt.findOneAndUpdate(
    { _id: attemptId, profileId: profileObjectId, state: "IN_PROGRESS" },
    { $set: { state: "EVALUATING", submittedAt: new Date() } },
    { returnDocument: "after" }
  ).select("+questions.correctOption +questions.explanation");
  if (!attempt) {
    const existing = await AssessmentAttempt.findOne({ _id: attemptId, profileId: profileObjectId }).lean();
    if (!existing) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
    throw new ApiError("This assessment was already submitted or is being evaluated.", 409, "DUPLICATE_SUBMISSION");
  }
  const expired = Date.now() > attempt.expiresAt.getTime();
  // The deadline is authoritative. A client must never be able to preserve
  // answers merely by claiming that this was an automatic timeout submission.
  const acceptedAnswers = expired ? {} : input.answers;
  const mcq = scoreMcq(acceptedAnswers, attempt.questions);
  const events = await IntegrityEvent.find({ targetId: attemptId }).lean();
  const integrity = integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>);
  const coding = input.codingSubmission.trim() && !expired ? await evaluateCodeSafely({ sourceCode: input.codingSubmission, problem: attempt.codingProblem as Parameters<typeof evaluateCodeSafely>[0]["problem"] }) : { status: "UNAVAILABLE" as const, message: expired ? "The coding submission arrived after the assessment deadline and was not evaluated." : "No coding submission was provided." };
  const finalScore = coding.status === "COMPLETED" ? Math.round(mcq.percentage * 0.7 + coding.score * 0.3) : mcq.percentage;
  const profile = await User.findById(profileObjectId).select("skills evidence");
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  const normalized = normalizeSkillName(attempt.skill);
  const skill = profile.skills.find((item) => normalizeSkillName(item.normalizedName || item.name) === normalized);
  if (!skill) {
    throw new ApiError("You cannot submit an assessment for a skill that is not on your profile.", 403, "SKILL_NOT_CLAIMED");
  }
  const evidenceCount = (skill.evidenceCount ?? 0) + profile.evidence.filter((entry) => entry.skills.some((name) => normalizeSkillName(name) === normalized)).length;
  const verificationStatus = verificationFor({ score: finalScore, integrityRisk: integrity.riskLevel, evidenceCount });
  skill.assessmentScore = Math.max(skill.assessmentScore ?? 0, finalScore);
  skill.status = verificationStatus;
  skill.evidenceCount = evidenceCount;
  skill.lastAssessmentAt = new Date();
  await profile.save();
  attempt.answers = new Map(Object.entries(acceptedAnswers));
  attempt.codingSubmission = input.codingSubmission.slice(0, 30000);
  attempt.mcqScore = mcq.percentage;
  attempt.codingScore = coding.status === "COMPLETED" ? coding.score : undefined;
  attempt.codingEvaluation = coding;
  attempt.integrityScore = integrity.score;
  attempt.finalScore = finalScore;
  attempt.riskLevel = integrity.riskLevel;
  attempt.verificationStatus = verificationStatus;
  attempt.state = expired ? "TIMED_OUT" : "COMPLETED";
  await attempt.save();
  return { id: attempt._id.toString(), skill: attempt.skill, state: attempt.state, mcq, coding, integrity, finalScore, verificationStatus, completedAt: attempt.submittedAt?.toISOString() ?? null };
}

export async function getAssessmentResult(profileId: string, attemptId: string) {
  const attempt = await AssessmentAttempt.findOne({ _id: objectId(attemptId), profileId: objectId(profileId) }).lean();
  if (!attempt) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  if (!attempt.finalScore && attempt.finalScore !== 0) throw new ApiError("This assessment has not been completed.", 409, "NOT_COMPLETE");
  const events = await IntegrityEvent.find({ targetId: attempt._id }).lean();
  return { id: attempt._id.toString(), skill: attempt.skill, state: attempt.state, mcq: { percentage: attempt.mcqScore ?? 0, total: attempt.questions.length, correct: Math.round(((attempt.mcqScore ?? 0) / 100) * attempt.questions.length) }, coding: attempt.codingEvaluation, integrity: integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>), finalScore: attempt.finalScore, verificationStatus: attempt.verificationStatus, completedAt: attempt.submittedAt?.toISOString() ?? null };
}
