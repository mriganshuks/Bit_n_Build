import AssessmentClient from "@/components/assessment-client";
import { safeDecodeSkill } from "@/lib/skills";

type AssessmentPageProps = {
  params: Promise<{ skill: string }>;
};

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { skill } = await params;
  const decodedSkill = safeDecodeSkill(skill);

  return <AssessmentClient skill={decodedSkill} />;
}
