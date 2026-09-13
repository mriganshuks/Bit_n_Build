export const ASSESSMENT_DURATION_SECONDS = 28 * 60;
export const CHALLENGE_DURATION_SECONDS = 12 * 60;

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type OptionId = "A" | "B" | "C" | "D";
export type AssessmentOption = { id: OptionId; text: string };
export type AssessmentQuestion = {
  id: string;
  prompt: string;
  topic: string;
  options: AssessmentOption[];
  correctOption: OptionId;
  explanation: string;
  fingerprint: string;
};
export type PublicQuestion = Omit<AssessmentQuestion, "correctOption" | "explanation" | "fingerprint">;
export type CodingProblem = {
  id: string;
  title: string;
  statement: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
  starterCode: string;
  language: "javascript";
  hiddenTests: Array<{ input: unknown; expected: unknown }>;
};
export type PublicCodingProblem = Omit<CodingProblem, "hiddenTests">;
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type VerificationStatus = "CLAIMED" | "PARTIALLY_VERIFIED" | "VERIFIED";
export type IntegrityEventType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "FULLSCREEN_EXIT"
  | "CAMERA_DISABLED"
  | "MICROPHONE_DISABLED"
  | "CAMERA_PERMISSION_LOST"
  | "MICROPHONE_PERMISSION_LOST"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "NETWORK_DISCONNECT"
  | "REPEATED_SUBMISSION";
export type IntegritySeverity = "LOW" | "MEDIUM" | "HIGH";
