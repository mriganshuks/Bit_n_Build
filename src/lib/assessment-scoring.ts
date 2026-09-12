import type {
  AssessmentStatus,
  IntegrityEvent,
  RiskLevel,
} from "@/lib/assessment-types";

export const VERIFICATION_THRESHOLDS = {
  verified: 80,
  partiallyVerified: 60,
} as const;

const INTEGRITY_DEDUCTIONS: Record<IntegrityEvent["type"], number> = {
  TAB_HIDDEN: 10,
  WINDOW_BLUR: 5,
  FULLSCREEN_EXIT: 5,
  COPY_ATTEMPT: 3,
  PASTE_ATTEMPT: 3,
  CONTEXT_MENU: 2,
  CAMERA_DISABLED: 15,
  MICROPHONE_DISABLED: 10,
  CAMERA_UNAVAILABLE: 15,
  MIC_UNAVAILABLE: 10,
  DEVTOOLS_SIGNAL: 10,
  NETWORK_DISCONNECT: 5,
  ASSESSMENT_TIMEOUT: 5,
};

export function calculateMcqScore(
  answers: Record<string, string>,
  correctAnswers: Record<string, string>
) {
  const total = Object.keys(correctAnswers).length;
  const score = Object.entries(correctAnswers).reduce(
    (count, [questionId, answer]) => count + (answers[questionId] === answer ? 1 : 0),
    0
  );

  return {
    score,
    total,
    percentage: total === 0 ? 0 : Math.round((score / total) * 100),
  };
}

export function getVerificationStatus(percentage: number): AssessmentStatus {
  if (percentage >= VERIFICATION_THRESHOLDS.verified) return "verified";
  if (percentage >= VERIFICATION_THRESHOLDS.partiallyVerified) return "partially_verified";
  return "not_verified";
}

export function calculateIntegrityScore(events: IntegrityEvent[]) {
  const deductions = events.reduce((total, event) => total + (INTEGRITY_DEDUCTIONS[event.type] ?? 0), 0);
  return Math.max(0, 100 - deductions);
}

export function classifyRisk(score: number, events: IntegrityEvent[]): RiskLevel {
  const highSignals = events.filter((event) => event.severity === "HIGH").length;
  if (score < 60 || highSignals >= 2) return "HIGH_RISK";
  if (score < 80 || highSignals === 1 || events.length >= 4) return "MEDIUM_RISK";
  if (score < 95 || events.length > 0) return "LOW_RISK";
  return "CLEAN";
}
