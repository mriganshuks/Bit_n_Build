import { connectToDatabase } from "@/lib/mongodb";
import { ApiError, errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getAssessmentAttempt, getActiveAssessmentAttempt } from "@/lib/assessment-service";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const skill = url.searchParams.get("skill");

    if (id) {
      return Response.json({ attempt: await getAssessmentAttempt(await requireCurrentProfileId(), id) });
    }

    if (skill) {
      const active = await getActiveAssessmentAttempt(await requireCurrentProfileId(), skill);
      return Response.json({ attempt: active });
    }

    throw new ApiError("An assessment ID or skill name is required.", 400, "PARAM_REQUIRED");
  } catch (error) {
    return errorResponse(error);
  }
}
