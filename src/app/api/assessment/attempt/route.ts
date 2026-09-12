import { getAttempt } from "@/lib/assessment-engine";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const id = cookieStore.get("pramaan_assessment_attempt")?.value;
  if (!id) return Response.json({ success: false, error: { code: "NO_ATTEMPT", message: "No active assessment attempt." } }, { status: 404 });
  const attempt = getAttempt(id);
  if (!attempt) return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Assessment attempt not found." } }, { status: 404 });
  return Response.json({ success: true, attempt });
}
