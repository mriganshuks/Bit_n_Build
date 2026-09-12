export const ASSESSMENT_DURATION_SECONDS = 8 * 60;
export const CODING_DURATION_SECONDS = 20 * 60;

export type AssessmentState =
  | "NOT_STARTED"
  | "READY"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "EVALUATED"
  | "FAILED"
  | "ERROR";

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type AssessmentStatus = "verified" | "partially_verified" | "not_verified";
export type RiskLevel = "CLEAN" | "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
export type IntegritySeverity = "LOW" | "MEDIUM" | "HIGH";

export type AssessmentOption = { id: "A" | "B" | "C" | "D"; text: string };

export type MCQQuestion = {
  id: string;
  type: "mcq";
  skill: string;
  difficulty: Difficulty;
  question: string;
  options: [AssessmentOption, AssessmentOption, AssessmentOption, AssessmentOption];
  correctOption: AssessmentOption["id"];
  explanation: string;
  topic: string;
};

export type PublicMCQQuestion = Omit<MCQQuestion, "correctOption" | "explanation">;

export type CodingProblem = {
  id: string;
  type: "coding";
  skill: string;
  difficulty: Difficulty;
  title: string;
  statement: string;
  input: string;
  output: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
  language: "javascript";
};

export type IntegrityEventType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "CONTEXT_MENU"
  | "CAMERA_DISABLED"
  | "MICROPHONE_DISABLED"
  | "CAMERA_UNAVAILABLE"
  | "MIC_UNAVAILABLE"
  | "DEVTOOLS_SIGNAL"
  | "NETWORK_DISCONNECT"
  | "ASSESSMENT_TIMEOUT";

export type IntegrityEvent = {
  type: IntegrityEventType;
  severity: IntegritySeverity;
  timestamp: string;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean>;
};

export type AssessmentResult = {
  assessmentId: string;
  skill: string;
  state: AssessmentState;
  mcqScore: number;
  mcqTotal: number;
  mcqPercentage: number;
  codingScore: number | null;
  integrityScore: number;
  riskLevel: RiskLevel;
  verificationStatus: AssessmentStatus;
  completedAt: string | null;
  signals: IntegrityEvent[];
  violationCount: number;
  cancellationReason?: string;
};
