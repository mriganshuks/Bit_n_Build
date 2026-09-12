import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate } from "@/lib/demo-data";

type CandidatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = getCandidate(id);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <Link href="/teammates" className="text-sm text-stone-600 underline underline-offset-4">
        Back to recommendations
      </Link>
      <p className="mt-10 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Candidate profile
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        {candidate.name}
      </h1>
      <p className="mt-2 text-lg text-stone-700">{candidate.role}</p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
        {candidate.why}
      </p>

      <section className="mt-10 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Verified skills
          </p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {candidate.skills.map((skill) => (
              <div key={skill.name} className="flex justify-between gap-4 py-4 text-sm">
                <span className="font-medium text-stone-900">{skill.name}</span>
                <span className="text-stone-600">
                  {skill.status === "verified" ? "Verified" : "Partially verified"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Evidence
          </p>
          <p className="mt-4 text-sm leading-6 text-stone-600">{candidate.evidence}</p>
          <p className="mt-5 text-sm font-medium text-stone-900">Projects</p>
          <ul className="mt-2 space-y-2 text-sm text-stone-600">
            {candidate.projects.map((project) => (
              <li key={project}>{project}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t border-stone-300 pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Before accepting a member
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">
          Validate the {candidate.challengeSkill} claim
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Send a short challenge so the team can make a decision with more than
          a profile claim.
        </p>
        <Link
          href={`/challenge/${candidate.id}`}
          className="mt-5 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Send skill challenge
        </Link>
      </section>
    </main>
  );
}
