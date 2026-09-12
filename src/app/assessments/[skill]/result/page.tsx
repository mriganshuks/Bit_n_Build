import Link from "next/link";
import { getAttempt } from "@/lib/assessment-engine";

type ResultPageProps = { params: Promise<{ skill: string }> };

export default async function AssessmentResultPage({ params }: ResultPageProps) {
  const { skill } = await params;
  const attempt = getAttempt(skill);

  if (!attempt?.result) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-stone-900">Result unavailable</h1>
        <p className="mt-4 text-sm text-stone-600">This result is unavailable in the current demo session.</p>
        <Link href="/assessments" className="mt-6 inline-block text-sm underline underline-offset-4">Return to assessments</Link>
      </main>
    );
  }

  const { result } = attempt;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill assessment complete</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">{attempt.skill}</h1>
      <div className="mt-8 grid gap-6 border-y border-stone-300 py-8 sm:grid-cols-4">
        <div><p className="text-sm text-stone-600">Skill score</p><p className="mt-1 text-3xl font-semibold">{result.mcqPercentage}%</p></div>
        <div><p className="text-sm text-stone-600">MCQ</p><p className="mt-1 text-3xl font-semibold">{result.mcqScore}/{result.mcqTotal}</p></div>
        <div><p className="text-sm text-stone-600">Integrity</p><p className="mt-1 text-3xl font-semibold">{result.integrityScore}/100</p></div>
        <div><p className="text-sm text-stone-600">Risk</p><p className="mt-1 text-lg font-semibold">{result.riskLevel.replaceAll("_", " ")}</p></div>
      </div>
      <p className="mt-6 text-lg font-semibold uppercase">{result.verificationStatus.replaceAll("_", " ")}</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Return to dashboard</Link>
    </main>
  );
}
