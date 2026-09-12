import AssessmentClient from "@/components/assessment-client";

type AssessmentPageProps = {
  params: Promise<{ skill: string }>;
};

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { skill } = await params;

  return <AssessmentClient skill={skill} />;
}
