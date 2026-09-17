import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentUserProfile } from "@/lib/profile-context";

export async function GET() {
  try {
    await connectToDatabase();
    const { user } = await requireCurrentUserProfile();
    const skills = (user.skills ?? []).map((skill) => ({
      name: skill.name,
      normalizedName: skill.normalizedName,
      status: skill.status,
      assessmentScore: skill.assessmentScore,
      evidenceCount: skill.evidenceCount,
      lastAssessmentAt: skill.lastAssessmentAt?.toISOString(),
    }));
    return Response.json({ skills });
  } catch (error) {
    return errorResponse(error);
  }
}
