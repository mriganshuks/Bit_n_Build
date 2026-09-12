const projects = [
  {
    name: "CampusConnect",
    role: "Full Stack Developer",
    technologies: "Next.js · MongoDB · Node.js",
    evidence: "GitHub project · Demo evidence",
  },
  {
    name: "AI Resume Analyzer",
    role: "Backend and API integration",
    technologies: "Python · FastAPI · React",
    evidence: "Project evidence available",
  },
  {
    name: "Hackathon Management Portal",
    role: "Frontend and API integration",
    technologies: "React · TypeScript · Express",
    evidence: "Project evidence available",
  },
];

export default function ProfilePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Profile
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Rajveer Singh
      </h1>
      <p className="mt-2 text-lg text-stone-700">Full Stack Developer</p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
        Computer science student focused on building reliable web applications
        and solving algorithmic problems.
      </p>

      <section className="mt-10 border-t border-stone-300 pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Evidence
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">
          Selected projects
        </h2>
        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {projects.map((project) => (
            <article key={project.name} className="grid gap-2 py-5 md:grid-cols-[1fr_1.2fr] md:gap-8">
              <div>
                <h3 className="font-medium text-stone-900">{project.name}</h3>
                <p className="mt-1 text-sm text-stone-600">{project.role}</p>
              </div>
              <div className="text-sm leading-6 text-stone-600">
                <p>{project.technologies}</p>
                <p className="mt-1 text-stone-800">{project.evidence}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
