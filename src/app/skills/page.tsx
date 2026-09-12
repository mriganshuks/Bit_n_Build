const skills = [
  ["C++", "92%", "Verified"],
  ["DSA", "88%", "Verified"],
  ["React", "82%", "Verified"],
  ["Next.js", "68%", "Partially verified"],
  ["Python", "Assessment pending", "Claimed"],
];

export default function SkillsPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Skills
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Claims with context
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
        A claimed skill is a starting point. Assessment evidence makes the
        status useful to teammates and evaluators.
      </p>

      <div className="mt-10 divide-y divide-stone-200 border-y border-stone-200">
        {skills.map(([name, score, status]) => (
          <div key={name} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
            <p className="font-medium text-stone-900">{name}</p>
            <p className="text-sm text-stone-600">{score}</p>
            <p className="text-sm font-medium text-stone-700">{status}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
