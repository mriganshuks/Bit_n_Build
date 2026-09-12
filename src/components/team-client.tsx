"use client";

import Link from "next/link";
import { useState } from "react";

type TeamState = {
  name: string;
  hackathon: string;
  requiredSkills: string[];
  members: Array<{ name: string; role: string; status: string }>;
  pending: string[];
};

type TeamClientProps = {
  initialTeam: TeamState;
};

export default function TeamClient({ initialTeam }: TeamClientProps) {
  const [team, setTeam] = useState(initialTeam);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  async function acceptAman() {
    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: "aman-sharma" }),
      });
      const data = (await response.json()) as TeamState & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update the team.");
      }

      setTeam(data);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to update the team.");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">My team</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{team.name}</h1>
      <p className="mt-2 text-base text-stone-600">{team.hackathon}</p>

      <section className="mt-10 border-t border-stone-300 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Team status</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">
              {team.members.length} / 4 members confirmed
            </h2>
          </div>
          <p className="text-sm text-stone-600">Needs: {team.requiredSkills.join(" · ")}</p>
        </div>

        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {team.members.map((member) => (
            <div key={member.name} className="flex flex-col justify-between gap-2 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium text-stone-900">{member.name}</p>
                <p className="mt-1 text-sm text-stone-600">{member.role}</p>
              </div>
              <p className="text-sm font-medium text-stone-700">{member.status}</p>
            </div>
          ))}
          {team.pending.length > 0 && (
            <div className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium text-stone-900">Aman Sharma</p>
                <p className="mt-1 text-sm text-stone-600">AI / ML · Pending decision</p>
              </div>
              <button
                type="button"
                onClick={() => void acceptAman()}
                disabled={isAccepting}
                className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 disabled:opacity-50"
              >
                {isAccepting ? "Accepting..." : "Accept Aman"}
              </button>
            </div>
          )}
        </div>
        {team.pending.length === 0 && (
          <p className="mt-5 text-sm text-stone-600">All current team seats are confirmed.</p>
        )}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </section>

      <Link href="/teammates" className="mt-8 text-sm font-medium text-stone-900 underline underline-offset-4">
        Review teammate recommendations
      </Link>
    </main>
  );
}
