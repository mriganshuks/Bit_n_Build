import type { IntegrityEvent, IntegrityEventType, IntegritySeverity } from "@/lib/assessment-types";

const allowedTypes = new Set<IntegrityEventType>([
  "TAB_HIDDEN", "WINDOW_BLUR", "FULLSCREEN_EXIT", "COPY_ATTEMPT", "PASTE_ATTEMPT",
  "CONTEXT_MENU", "CAMERA_DISABLED", "MICROPHONE_DISABLED", "CAMERA_UNAVAILABLE",
  "MIC_UNAVAILABLE", "DEVTOOLS_SIGNAL", "NETWORK_DISCONNECT", "ASSESSMENT_TIMEOUT",
]);

export function createIntegrityEvent(input: {
  type: IntegrityEventType;
  severity?: IntegritySeverity;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean>;
}): IntegrityEvent {
  if (!allowedTypes.has(input.type)) throw new Error("Unsupported integrity event.");
  return {
    type: input.type,
    severity: input.severity ?? (input.type === "TAB_HIDDEN" || input.type === "CAMERA_DISABLED" ? "HIGH" : "MEDIUM"),
    timestamp: new Date().toISOString(),
    ...(input.durationMs === undefined ? {} : { durationMs: Math.max(0, Math.round(input.durationMs)) }),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}
