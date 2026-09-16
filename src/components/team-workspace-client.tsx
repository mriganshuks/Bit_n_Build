"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";

type Team = {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  capacity: number;
  members: Array<{
    profileId: string;
    role: string;
    status: string;
    profile?: { displayName?: string; headline?: string };
  }>;
  hackathonName?: string;
};

type Candidate = {
  id: string;
  displayName: string;
  headline: string;
  matchScore: number;
  reasons: string[];
  skills: Array<{ name: string; status: string; assessmentScore?: number }>;
};

type Challenge = {
  id: string;
  candidateName: string;
  candidateHeadline: string;
  skill: string;
  state: string;
  score?: number;
  integrity: { score: number; riskLevel: string } | null;
  decision?: string;
  canDecide: boolean;
};

type Invitation = {
  id: string;
  message: string;
  createdAt: string;
  team: { id: string; name: string; requiredSkills: string[] };
};

function status(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default function TeamWorkspaceClient() {
  const { authState, loading: authLoading, signIn } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { teams } = await apiFetch<{ teams: Team[] }>("/api/teams");
      const { invitations: pendingInvitations } = await apiFetch<{
        invitations: Invitation[];
      }>("/api/invitations").catch(() => ({ invitations: [] }));

      setInvitations(pendingInvitations || []);

      if (!teams.length) {
        setTeam(null);
        setCandidates([]);
        setChallenges([]);
        return;
      }

      const { team: loaded } = await apiFetch<{ team: Team }>(`/api/teams/${teams[0].id}`);
      setTeam(loaded);

      const { challenges: loadedChallenges } = await apiFetch<{
        challenges: Challenge[];
      }>(`/api/teams/${loaded.id}/challenges/list`).catch(() => ({ challenges: [] }));
      setChallenges(loadedChallenges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load team workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (authState === "UNAUTHENTICATED") {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, authState, load]);

  async function discover() {
    if (!team) return;
    try {
      const { candidates: discovered } = await apiFetch<{ candidates: Candidate[] }>(
        `/api/teams/${team.id}/candidates`
      );
      setCandidates(discovered);
      if (!discovered.length) {
        setNotice("No available profiles currently match this team’s required skills.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to discover candidates.");
    }
  }

  async function invite(candidate: Candidate) {
    if (!team) return;
    try {
      await apiFetch(`/api/teams/${team.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          candidateId: candidate.id,
          message: `Your profile matches ${team.name}'s required skills.`,
        }),
      });
      setNotice(`Invitation sent to ${candidate.displayName}. They can respond from their dashboard.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send invitation.");
    }
  }

  async function decide(challenge: Challenge, decision: "ACCEPT" | "REJECT") {
    try {
      await apiFetch(`/api/challenges/${challenge.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setNotice(
        `${challenge.candidateName} was ${
          decision === "ACCEPT" ? "accepted to the team" : "not accepted"
        }.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record that decision.");
    }
  }

  async function respondToInvitation(invitationId: string, action: "ACCEPT" | "REJECT") {
    try {
      await apiFetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setNotice(action === "ACCEPT" ? "You joined the team!" : "Invitation declined.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to respond to invitation.");
    }
  }

  // 1. AUTH LOADING OR INITIAL DATA LOADING
  if (authLoading || (loading && !team && !error)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Team workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Loading your team…</h1>
        <p className="mt-3 text-sm text-stone-600">Retrieving hackathon teams and invitations.</p>
      </main>
    );
  }

  // 2. UNAUTHENTICATED STATE
  if (authState === "UNAUTHENTICATED") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Team workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Sign in to view your team</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          Join a hackathon, form a team, and discover verified builders by their actual evidence.
        </p>
        <button
          type="button"
          onClick={() => void signIn()}
          className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  // 3. ERROR STATE
  if (error && !team) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Team workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Unable to load team</h1>
        <p className="mt-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => void load()}
            className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50"
          >
            Try again
          </button>
          <Link
            href="/hackathons"
            className="inline-flex h-10 items-center border border-stone-400 px-4 text-sm text-stone-800 hover:bg-stone-100"
          >
            Explore hackathons
          </Link>
        </div>
      </main>
    );
  }

  // 3. NO TEAM & PENDING INVITATIONS STATES
  if (!team) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Team workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">No active team</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          You are not currently part of a hackathon team. Join a hackathon to form a team, or respond to an invitation below.
        </p>

        {notice && (
          <p className="mt-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        {/* PENDING INVITATION SECTION */}
        {invitations.length > 0 && (
          <section className="mt-8 border-t border-stone-300 pt-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Pending invitations
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">
              You have {invitations.length} team invitation{invitations.length === 1 ? "" : "s"}
            </h2>
            <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
              {invitations.map((inv) => (
                <article
                  key={inv.id}
                  className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h3 className="font-semibold text-stone-900">{inv.team.name}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Looking for: {inv.team.requiredSkills.join(", ")}
                    </p>
                    {inv.message && (
                      <p className="mt-1 text-xs text-stone-500 italic">“{inv.message}”</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => void respondToInvitation(inv.id, "REJECT")}
                      className="h-9 border border-stone-400 px-3 text-xs font-medium text-stone-800 hover:bg-stone-100"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => void respondToInvitation(inv.id, "ACCEPT")}
                      className="h-9 border border-stone-900 bg-stone-900 px-4 text-xs font-medium text-stone-50 hover:bg-stone-800"
                    >
                      Accept & Join
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* NO TEAM ACTIONS */}
        <section className="mt-8 border-t border-stone-300 pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Next steps
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border border-stone-300 bg-white p-6">
              <h3 className="font-semibold text-stone-900">Join a Hackathon</h3>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                Browse ongoing and upcoming hackathons. Once registered, you can start a team or be matched with other builders.
              </p>
              <Link
                href="/hackathons"
                className="mt-4 inline-flex h-9 items-center border border-stone-900 bg-stone-900 px-4 text-xs font-medium text-stone-50 hover:bg-stone-800"
              >
                Browse hackathons
              </Link>
            </div>

            <div className="border border-stone-300 bg-white p-6">
              <h3 className="font-semibold text-stone-900">Build Your Verification</h3>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                Teams discover participants based on verified skills and evidence. Take a technical assessment to rank higher in discovery.
              </p>
              <Link
                href="/assessments"
                className="mt-4 inline-flex h-9 items-center border border-stone-400 px-4 text-xs font-medium text-stone-800 hover:bg-stone-100"
              >
                Take an assessment
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // 4. ACTIVE TEAM STATE
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Active team
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">{team.name}</h1>
          <p className="mt-1 text-sm text-stone-600">{team.description || "A hackathon team on PRAMAAN."}</p>
        </div>
        {team.hackathonName && (
          <span className="border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            {team.hackathonName}
          </span>
        )}
      </div>

      {notice && (
        <p className="mt-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {/* MEMBERS & REQUIRED SKILLS */}
      <section className="mt-9 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Confirmed members
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            {team.members.length} / {team.capacity} seats filled
          </h2>
          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {team.members.map((member) => (
              <div key={member.profileId} className="py-4">
                <p className="font-medium text-stone-900">
                  {member.profile?.displayName ?? "Team member"}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {member.role} · {status(member.status)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Required skills
          </p>
          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {team.requiredSkills.map((skill) => (
              <p key={skill} className="py-4 text-sm font-medium text-stone-900">
                {skill}
              </p>
            ))}
          </div>
          <button
            onClick={() => void discover()}
            className="mt-5 h-10 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
          >
            Discover candidate matches
          </button>
        </div>
      </section>

      {/* DISCOVERED CANDIDATES */}
      {candidates.length > 0 && (
        <section className="mt-12 border-t border-stone-300 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Intelligent Discovery
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Candidate Matches</h2>
          <p className="mt-2 text-sm text-stone-600">
            Ranked by verified skills, evidence-backed projects, and complementary hackathon abilities.
          </p>
          <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-stone-900">{candidate.displayName}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {candidate.headline || "PRAMAAN participant"}
                    </p>
                  </div>
                  <span className="border border-stone-900 bg-stone-900 px-3 py-1 text-xs font-semibold text-stone-50">
                    Match {candidate.matchScore}%
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  {candidate.reasons.join(" · ")}
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <button
                    onClick={() => void invite(candidate)}
                    className="text-sm font-medium underline underline-offset-4 hover:text-stone-700"
                  >
                    Invite to team
                  </button>
                  <Link
                    href={`/teammates/${candidate.id}?team=${team.id}`}
                    className="text-sm font-medium underline underline-offset-4 hover:text-stone-700"
                  >
                    View profile & challenge
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* POTENTIAL MEMBER CHALLENGES */}
      <section className="mt-12 border-t border-stone-300 pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Potential Member Challenges
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">Candidate Challenge Reviews</h2>
        <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {challenges.map((challenge) => (
            <article
              key={challenge.id}
              className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium text-stone-900">
                  {challenge.candidateName} · {challenge.skill}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Status: {status(challenge.state)}
                  {challenge.score !== undefined && ` · Score: ${challenge.score}%`}
                  {challenge.integrity &&
                    ` · Integrity: ${challenge.integrity.score}/100 (${status(
                      challenge.integrity.riskLevel
                    )} risk)`}
                </p>
              </div>
              {challenge.canDecide ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => void decide(challenge, "REJECT")}
                    className="h-9 border border-stone-400 px-3 text-xs font-medium text-stone-800 hover:bg-stone-100"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => void decide(challenge, "ACCEPT")}
                    className="h-9 border border-stone-900 bg-stone-900 px-4 text-xs font-medium text-stone-50 hover:bg-stone-800"
                  >
                    Accept to Team
                  </button>
                </div>
              ) : (
                <span className="text-xs font-medium uppercase tracking-wider text-stone-600">
                  {challenge.decision ? status(challenge.decision) : "Awaiting completion"}
                </span>
              )}
            </article>
          ))}
          {challenges.length === 0 && (
            <p className="py-5 text-sm text-stone-600">
              No skill challenges sent yet. Challenge a candidate from their profile to validate skills before accepting.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export function CreateTeamClient({ hackathonId }: { hackathonId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          hackathonId,
          name: form.get("name"),
          description: form.get("description"),
          requiredSkills: String(form.get("requiredSkills"))
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          capacity: Number(form.get("capacity")),
        }),
      });
      setCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create team.");
    }
  }

  if (created) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-stone-900">Team created successfully</h1>
        <p className="mt-3 text-sm text-stone-600">
          Your team is now registered. Open the team workspace to begin discovering candidate matches.
        </p>
        <Link
          href="/team"
          className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Open team workspace
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Team Formation
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">Define your team needs</h1>
      <p className="mt-2 text-sm text-stone-600">
        Specify required skills to get explainable candidate matches backed by verified proof.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-5 border-t border-stone-300 pt-7">
        <label className="grid gap-2 text-sm font-medium">
          Team name
          <input
            required
            name="name"
            placeholder="e.g. Algorithmic Architects"
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          What are you building?
          <textarea
            name="description"
            placeholder="Briefly describe the product or problem you plan to tackle."
            className="min-h-24 border border-stone-300 bg-white p-3"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Required skills (comma-separated)
          <input
            required
            name="requiredSkills"
            placeholder="e.g. TypeScript, Next.js, Python, UI/UX"
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Team capacity
          <input
            required
            name="capacity"
            defaultValue="4"
            min="2"
            max="12"
            type="number"
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button className="h-11 w-fit border border-stone-900 bg-stone-900 px-6 text-sm font-medium text-stone-50 hover:bg-stone-800">
          Create team
        </button>
      </form>
    </main>
  );
}
