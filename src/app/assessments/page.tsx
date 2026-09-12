import Link from "next/link";

export default function AssessmentsPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Assessments
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Technical proof, one skill at a time
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
        Short MCQ assessments will turn claimed skills into transparent,
        evidence-backed verification results.
      </p>
      <div className="mt-10 border-y border-stone-200 py-5">
        <p className="font-medium text-stone-900">JavaScript assessment</p>
        <p className="mt-1 text-sm text-stone-600">8 MCQs · timed coding draft · integrity signals</p>
        <Link
          href="/assessments/javascript"
          className="mt-4 inline-flex h-10 items-center border border-stone-900 px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
        >
          Start assessment
        </Link>
      </div>
    </main>
  );
}
