import { getSkillStatuses, type VerificationStatus } from "@/lib/assessment";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function readableStatus(status: VerificationStatus) {
  return status === "partially_verified"
    ? "Partially verified"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function SkillsPage() {
  const cookieStore = await cookies();
  const javascriptPercentage = Number(
    cookieStore.get("pramaan_javascript_percentage")?.value
  );
  const javascriptStatus = cookieStore.get("pramaan_javascript_status")?.value;
  const skills = getSkillStatuses(
    javascriptPercentage >= 0 && javascriptStatus
      ? {
          percentage: javascriptPercentage,
          status: javascriptStatus as Exclude<VerificationStatus, "claimed">,
        }
      : undefined
  );

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
        {skills.map((skill) => (
          <div key={skill.name} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
            <p className="font-medium text-stone-900">{skill.name}</p>
            <p className="text-sm text-stone-600">{skill.score}</p>
            <p className="text-sm font-medium text-stone-700">{readableStatus(skill.status)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
