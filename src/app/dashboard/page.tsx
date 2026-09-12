import Link from "next/link";
import { getSkillStatuses, type VerificationStatus } from "@/lib/assessment";
import { getTeamState } from "@/lib/demo-data";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const demoProfile = {
  name: "Rajveer Singh",
  role: "Full Stack Developer",
  bio: "Computer science student focused on building reliable web applications and solving algorithmic problems.",
};

function readableStatus(status: VerificationStatus) {
  return status === "partially_verified"
    ? "Partially verified"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const javascriptPercentage = Number(
    cookieStore.get("pramaan_javascript_percentage")?.value
  );
  const javascriptStatus = cookieStore.get("pramaan_javascript_status")?.value;
  const integrityScore = cookieStore.get("pramaan_assessment_integrity")?.value;
  const riskLevel = cookieStore.get("pramaan_assessment_risk")?.value;
  const skills = getSkillStatuses(
    javascriptPercentage >= 0 && javascriptStatus
      ? {
          percentage: javascriptPercentage,
          status: javascriptStatus as Exclude<VerificationStatus, "claimed">,
        }
      : undefined
  );
  const team = getTeamState(cookieStore.has("pramaan_aman_accepted"));
  const verifiedCount = skills.filter((skill) => skill.status === "verified").length;
  const pendingCount = skills.filter((skill) => skill.status === "claimed").length;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        PRAMAAN dashboard
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
        Welcome back, {demoProfile.name.split(" ")[0]}
      </h1>
      <p className="mt-3 text-base leading-7 text-stone-600">
        Claims become useful when they are supported by evidence. Review your
        skill verification and continue building your hackathon profile.
      </p>

      <section className="mt-10 border-t border-stone-300 pt-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Profile
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">
              {demoProfile.role}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
              {demoProfile.bio}
            </p>
          </div>
          <Link
            href="#skills"
            className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
          >
            Review skills
          </Link>
        </div>
      </section>

      <section id="skills" className="mt-12 border-t border-stone-300 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Evidence-backed profile
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">
              Skills
            </h2>
          </div>
          <span className="text-sm text-stone-500">
            {verifiedCount} verified · {pendingCount} pending
          </span>
        </div>

        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
            >
              <p className="font-medium text-stone-900">{skill.name}</p>
              <p className="text-sm text-stone-600">{skill.score}</p>
              <p className="text-sm font-medium text-stone-700">
                {readableStatus(skill.status)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Assessment results
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            Keep proving what you can do
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Complete a short technical assessment to turn a claimed skill into
            evidence that teammates can trust.
          </p>
          <Link
            href="/assessments"
            className="mt-5 inline-flex h-10 items-center border border-stone-900 px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
          >
            Take JavaScript assessment
          </Link>
        </div>
        <div className="border-l border-stone-300 pl-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Current hackathon
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            Innovate India 2026
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {team.name} · {team.members.length} / 4 members confirmed
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Need: {team.requiredSkills.join(" · ")}
          </p>
          <Link
            href="/teammates"
            className="mt-5 inline-flex text-sm font-medium text-stone-900 underline underline-offset-4"
          >
            Find complementary teammates
          </Link>
        </div>
      </section>

      <section className="mt-12 border-t border-stone-300 pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Recent activity
        </p>
        <ul className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-3">
          <li className="border-l-2 border-stone-400 pl-3">JavaScript assessment completed</li>
          <li className="border-l-2 border-stone-400 pl-3">Skill verification updated</li>
          <li className="border-l-2 border-stone-400 pl-3">
            {team.members.length === 4 ? "Aman accepted to BuildX" : "Aman invited to BuildX"}
          </li>
        </ul>
      </section>

      {integrityScore && riskLevel && (
        <section className="mt-12 border-t border-stone-300 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Latest assessment integrity
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-4">
            <p className="text-2xl font-semibold text-stone-900">{integrityScore} / 100</p>
            <p className="text-sm font-medium text-stone-700">{riskLevel.replaceAll("_", " ")}</p>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            Integrity signals are reviewed separately from skill performance.
          </p>
        </section>
      )}
    </main>
  );
}
