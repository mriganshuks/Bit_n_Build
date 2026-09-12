import Link from "next/link";
import { getCandidates } from "@/lib/demo-data";

export default function TeammatesPage() {
  const candidates = getCandidates();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Find teammates
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Complementary skills, clearer matches
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
        Recommendations explain which required skills each participant brings
        to your hackathon team.
      </p>
      <section className="mt-10 border-t border-stone-300 pt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Innovate India 2026 · BuildX
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            Recommended participants
          </h2>
        </div>
        <p className="text-sm text-stone-600">Team needs: AI / ML · Backend · UI/UX</p>
      </div>

      <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="py-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">{candidate.name}</h3>
                <p className="mt-1 text-sm text-stone-600">{candidate.role}</p>
              </div>
              <p className="text-sm font-semibold text-stone-900">Match: {candidate.matchScore}%</p>
            </div>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-stone-600 md:grid-cols-[1fr_1.4fr]">
              <p>
                <span className="font-medium text-stone-900">Verified skills:</span>{" "}
                {candidate.skills.map((skill) => skill.name).join(" · ")}
              </p>
              <p>
                <span className="font-medium text-stone-900">Why recommended:</span>{" "}
                {candidate.why}
              </p>
            </div>
            <Link
              href={`/teammates/${candidate.id}`}
              className="mt-4 inline-flex text-sm font-medium text-stone-900 underline underline-offset-4"
            >
              View candidate
            </Link>
          </article>
        ))}
      </div>
      </section>
    </main>
  );
}
