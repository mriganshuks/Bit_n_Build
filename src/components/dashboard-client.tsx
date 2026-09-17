"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type Profile = {
  id: string;
  displayName: string;
  headline: string;
  skills: Array<{ name: string; status: string; assessmentScore?: number; evidenceCount: number }>;
};

type Team = {
  id: string;
  name: string;
  requiredSkills: string[];
  members: unknown[];
  capacity: number;
};

type Invitation = {
  id: string;
  message: string;
  team: { id: string; name: string; requiredSkills: string[] };
};

type Challenge = {
  id: string;
  teamName: string;
  skill: string;
  state: string;
  expiresAt: string | null;
  score?: number;
  decision?: string;
};

const label = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

import { apiFetch } from "@/lib/api-client";

export default function DashboardClient() {
  const { profile: authProfile, loading: authLoading, authState, signIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentProfile = profile ?? (authProfile as unknown as Profile | null);

  const load = useCallback(async () => {
    try {
      const [profileData, teamData, invitationData, challengeData] =
        await Promise.all([
          apiFetch<{ profile: Profile }>("/api/profile"),
          apiFetch<{ teams: Team[] }>("/api/teams").catch(() => ({ teams: [] })),
          apiFetch<{ invitations: Invitation[] }>("/api/invitations").catch(() => ({ invitations: [] })),
          apiFetch<{ challenges: Challenge[] }>("/api/challenges").catch(() => ({ challenges: [] })),
        ]);

      setProfile(profileData.profile);
      setTeams(teamData.teams ?? []);
      setInvitations(invitationData.invitations ?? []);
      setChallenges(challengeData.challenges ?? []);
    } catch (err) {
      // If profile is not found or unauthenticated, handle safely
      setProfile(null);
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || authState === "UNAUTHENTICATED") return;
    void Promise.resolve().then(() => load());
  }, [authLoading, authState, load]);

  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function respond(invitation: Invitation, action: "ACCEPT" | "REJECT") {
    if (respondingId) return;
    setRespondingId(invitation.id);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/invitations/${invitation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setNotice(action === "ACCEPT" ? `You joined ${invitation.team.name}.` : `You declined ${invitation.team.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to respond to invitation.");
    } finally {
      setRespondingId(null);
    }
  }

  // 1. Auth is still loading
  if (authLoading || (dataLoading && !profile)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 text-sm text-stone-600">
        Loading dashboard…
      </main>
    );
  }

  // 2. Unauthenticated state
  if (authState === "UNAUTHENTICATED") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Sign in to access your dashboard</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          Sign in with Google to view your verified skills, track assessments, and coordinate with hackathon teams.
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

  // 3. Authenticated but profile not yet created (onboarding)
  if (!currentProfile) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Account setup
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Your profile comes first</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          {error ?? "Create your PRAMAAN profile to begin verifying skills, taking assessments, and joining hackathon teams."}
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/onboarding"
            className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
          >
            Create PRAMAAN profile
          </Link>
          {error && (
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 items-center border border-stone-400 px-4 text-sm font-medium text-stone-800 hover:bg-stone-100"
            >
              Retry
            </button>
          )}
        </div>
      </main>
    );
  }

  const verifiedSkills = currentProfile.skills.filter((skill) => skill.status === "VERIFIED");
  const partiallyVerifiedSkills = currentProfile.skills.filter(
    (skill) => skill.status === "PARTIALLY_VERIFIED"
  );
  const claimedSkills = currentProfile.skills.filter((skill) => skill.status === "CLAIMED");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          PRAMAAN dashboard
        </p>
        <span className="text-xs text-stone-500">
          Canonical identity: {currentProfile.displayName}
        </span>
      </div>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
        Welcome, {currentProfile.displayName.split(" ")[0]}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        {currentProfile.headline || "A verified skill portfolio backed by proctored assessments, transparent integrity telemetry, and traceable code evidence."}
      </p>

      {notice && (
        <div className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-red-600 hover:text-red-900 underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SKILL VERIFICATION STATUS OVERVIEW */}
      <section className="mt-10 border-t border-stone-300 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Skill verification
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">
              {verifiedSkills.length} verified · {partiallyVerifiedSkills.length} evidence-backed · {claimedSkills.length} claimed
            </h2>
          </div>
          <div className="flex gap-3">
            <Link
              href="/skills"
              className="inline-flex h-10 items-center border border-stone-400 px-4 text-sm font-medium text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              Manage skills
            </Link>
            <Link
              href="/assessments"
              className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              Take an assessment
            </Link>
          </div>
        </div>

        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {currentProfile.skills.slice(0, 8).map((skill) => (
            <div key={skill.name} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <p className="font-medium text-stone-900">{skill.name}</p>
                <p className="text-xs text-stone-500">
                  {skill.evidenceCount} evidence link{skill.evidenceCount === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-sm text-stone-600">
                {skill.assessmentScore === undefined
                  ? "Assessment pending"
                  : `Score: ${skill.assessmentScore}%`}
              </p>
              <span
                className={`inline-block w-fit px-2.5 py-0.5 text-xs font-medium ${
                  skill.status === "VERIFIED"
                    ? "border border-stone-900 bg-stone-900 text-stone-50"
                    : skill.status === "PARTIALLY_VERIFIED"
                    ? "border border-stone-400 bg-stone-100 text-stone-800"
                    : "border border-stone-300 text-stone-600"
                }`}
              >
                {label(skill.status)}
              </span>
            </div>
          ))}
          {currentProfile.skills.length === 0 && (
            <p className="py-6 text-sm text-stone-600">
              No skills claimed yet. Add technical skills to your profile to begin taking assessments.
            </p>
          )}
        </div>
      </section>

      {/* TEAM SKILL CHALLENGES */}
      {challenges.length > 0 && (
        <section className="mt-12 border-t border-stone-300 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Team skill challenges
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Challenges awaiting action</h2>
          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {challenges.map((challenge) => (
              <article
                key={challenge.id}
                className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center hover:bg-stone-50/50 transition-colors px-2 -mx-2"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {challenge.teamName} · {challenge.skill}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Status: {label(challenge.state)}
                    {challenge.score !== undefined && ` · Score: ${challenge.score}%`}
                    {challenge.decision && ` · Decision: ${label(challenge.decision)}`}
                  </p>
                </div>
                <Link
                  href={`/challenge/${challenge.id}`}
                  className="inline-flex h-9 items-center border border-stone-900 px-4 text-xs font-medium text-stone-900 hover:bg-stone-100 active:bg-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  {challenge.state === "SENT" ? "Open challenge" : "View challenge result"}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* INVITATIONS */}
      {invitations.length > 0 && (
        <section className="mt-12 border-t border-stone-300 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Team invitations
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Choose where to build</h2>
          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            {invitations.map((invitation) => {
              const isResponding = respondingId === invitation.id;
              return (
                <article
                  key={invitation.id}
                  className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center hover:bg-stone-50/50 transition-colors px-2 -mx-2"
                >
                  <div>
                    <p className="font-medium text-stone-900">{invitation.team.name}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Looking for: {invitation.team.requiredSkills.join(", ")}
                    </p>
                    {invitation.message && (
                      <p className="mt-1 text-xs text-stone-500 italic">“{invitation.message}”</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={Boolean(respondingId)}
                      onClick={() => void respond(invitation, "REJECT")}
                      className="h-9 border border-stone-400 px-3 text-xs font-medium text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                    >
                      {isResponding ? "Processing…" : "Decline"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(respondingId)}
                      onClick={() => void respond(invitation, "ACCEPT")}
                      className="h-9 border border-stone-900 bg-stone-900 px-4 text-xs font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                    >
                      {isResponding ? "Joining…" : "Accept"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* HACKATHON TEAMS & EVIDENCE NEXT ACTIONS */}
      <section className="mt-12 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Traceable Evidence
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Proof with context</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Public repositories and competitive profiles back your claimed skills and increase candidate discovery matching.
          </p>
          <Link
            href="/profile"
            className="mt-5 inline-block text-sm font-medium underline underline-offset-4 hover:text-stone-700"
          >
            Add projects and external links
          </Link>
        </div>

        <div className="border-l border-stone-300 pl-0 md:pl-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Hackathon Collaboration
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            {teams.length ? teams[0].name : "Find your team"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {teams.length
              ? `${teams[0].members.length} of ${teams[0].capacity} seats filled · Required skills: ${teams[0].requiredSkills.join(", ")}`
              : "Register for a hackathon, define your required skills, and discover verified candidates."}
          </p>
          <Link
            href={teams.length ? "/team" : "/hackathons"}
            className="mt-5 inline-block text-sm font-medium underline underline-offset-4 hover:text-stone-700"
          >
            {teams.length ? "Open team workspace" : "Explore hackathons"}
          </Link>
        </div>
      </section>
    </main>
  );
}
