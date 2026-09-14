"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Team = { id: string; name: string; description: string; requiredSkills: string[]; capacity: number; members: Array<{ profileId: string; role: string; status: string; profile?: { displayName?: string } }>; hackathonName?: string };
type Candidate = { id: string; displayName: string; headline: string; matchScore: number; reasons: string[]; skills: Array<{ name: string; status: string; assessmentScore?: number }> };
type Challenge = { id: string; candidateName: string; candidateHeadline: string; skill: string; state: string; score?: number; integrity: { score: number; riskLevel: string } | null; decision?: string; canDecide: boolean };

async function api<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed.");
  return body as T;
}

function status(value: string) { return value.replaceAll("_", " ").toLowerCase(); }

export default function TeamWorkspaceClient() {
  const [team, setTeam] = useState<Team | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { teams } = await api<{ teams: Team[] }>("/api/teams");
      if (!teams.length) { setTeam(null); return; }
      const { team: loaded } = await api<{ team: Team }>(`/api/teams/${teams[0].id}`);
      setTeam(loaded);
      const { challenges: loadedChallenges } = await api<{ challenges: Challenge[] }>(`/api/teams/${loaded.id}/challenges/list`);
      setChallenges(loadedChallenges);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load team workspace.");
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function discover() {
    if (!team) return;
    try {
      const { candidates } = await api<{ candidates: Candidate[] }>(`/api/teams/${team.id}/candidates`);
      setCandidates(candidates);
      if (!candidates.length) setNotice("No available profiles currently match this team’s required skills.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to discover candidates."); }
  }

  async function invite(candidate: Candidate) {
    if (!team) return;
    try {
      await api(`/api/teams/${team.id}/invitations`, { method: "POST", body: JSON.stringify({ candidateId: candidate.id, message: `Your profile matches ${team.name}'s required skills.` }) });
      setNotice(`Invitation sent to ${candidate.displayName}. They can respond from their dashboard.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to send invitation."); }
  }

  async function decide(challenge: Challenge, decision: "ACCEPT" | "REJECT") {
    try {
      await api(`/api/challenges/${challenge.id}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
      setNotice(`${challenge.candidateName} was ${decision === "ACCEPT" ? "accepted to the team" : "not accepted"}.`);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to record that decision."); }
  }

  if (!team && !error) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">Loading team workspace…</main>;
  if (!team) return <main className="mx-auto max-w-5xl px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">My team</p><h1 className="mt-3 text-3xl font-semibold">No team yet</h1><p className="mt-3 text-stone-600">{error ?? "Join a hackathon first, then create a team with the skills you need."}</p><Link href="/hackathons" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Explore hackathons</Link></main>;

  return <main className="mx-auto w-full max-w-5xl px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Team workspace</p><h1 className="mt-3 text-3xl font-semibold">{team.name}</h1><p className="mt-2 text-sm text-stone-600">{team.description || "A hackathon team on PRAMAAN."}</p>{notice && <p className="mt-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <p className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<section className="mt-9 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Members</p><h2 className="mt-2 text-2xl font-semibold">{team.members.length} / {team.capacity} confirmed</h2><div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">{team.members.map((member) => <div key={member.profileId} className="py-4"><p className="font-medium">{member.profile?.displayName ?? "Team member"}</p><p className="mt-1 text-sm text-stone-600">{member.role} · {status(member.status)}</p></div>)}</div></div><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Required skills</p><div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">{team.requiredSkills.map((skill) => <p key={skill} className="py-4 text-sm font-medium">{skill}</p>)}</div><button onClick={() => void discover()} className="mt-5 h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Discover candidates</button></div></section>{candidates.length > 0 && <section className="mt-12 border-t border-stone-300 pt-8"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Explainable matches</p><h2 className="mt-2 text-2xl font-semibold">Candidate discovery</h2><div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">{candidates.map((candidate) => <article key={candidate.id} className="py-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{candidate.displayName}</h3><p className="mt-1 text-sm text-stone-600">{candidate.headline || "PRAMAAN participant"}</p></div><p className="font-semibold">Match {candidate.matchScore}%</p></div><p className="mt-3 text-sm leading-6 text-stone-600">{candidate.reasons.join(" · ")}</p><div className="mt-4 flex flex-wrap gap-4"><button onClick={() => void invite(candidate)} className="text-sm underline underline-offset-4">Invite to team</button><Link href={`/teammates/${candidate.id}?team=${team.id}`} className="text-sm underline underline-offset-4">View and challenge</Link></div></article>)}</div></section>}<section className="mt-12 border-t border-stone-300 pt-8"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Candidate challenges</p><h2 className="mt-2 text-2xl font-semibold">Review before you decide</h2><div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">{challenges.map((challenge) => <article key={challenge.id} className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"><div><p className="font-medium">{challenge.candidateName} · {challenge.skill}</p><p className="mt-1 text-sm text-stone-600">{status(challenge.state)}{challenge.score === undefined ? "" : ` · ${challenge.score}%`} {challenge.integrity ? `· integrity ${challenge.integrity.score}/100, ${status(challenge.integrity.riskLevel)} risk` : ""}</p></div>{challenge.canDecide ? <div className="flex gap-3"><button onClick={() => void decide(challenge, "REJECT")} className="h-10 border border-stone-400 px-4 text-sm">Reject</button><button onClick={() => void decide(challenge, "ACCEPT")} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Accept</button></div> : <p className="text-sm font-medium">{challenge.decision ? status(challenge.decision) : "Awaiting completion"}</p>}</article>)}{challenges.length === 0 && <p className="py-5 text-sm text-stone-600">Send a skill challenge from a candidate profile to make a decision with more evidence.</p>}</div></section></main>;
}

export function CreateTeamClient({ hackathonId }: { hackathonId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { await api("/api/teams", { method: "POST", body: JSON.stringify({ hackathonId, name: form.get("name"), description: form.get("description"), requiredSkills: String(form.get("requiredSkills")).split(",").map((item) => item.trim()).filter(Boolean), capacity: Number(form.get("capacity")) }) }); setCreated(true); } catch (error) { setError(error instanceof Error ? error.message : "Unable to create team."); }
  }
  if (created) return <main className="mx-auto max-w-3xl px-6 py-10"><h1 className="text-3xl font-semibold">Team created</h1><Link href="/team" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Open team workspace</Link></main>;
  return <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Create team</p><h1 className="mt-3 text-3xl font-semibold">Set the team’s real needs</h1><form onSubmit={submit} className="mt-8 grid gap-5 border-t border-stone-300 pt-7"><label className="grid gap-2 text-sm">Team name<input required name="name" className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm">What are you building?<textarea name="description" className="min-h-24 border border-stone-300 bg-white p-3" /></label><label className="grid gap-2 text-sm">Required skills<input required name="requiredSkills" placeholder="e.g. Python, React, UI/UX" className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm">Team capacity<input required name="capacity" defaultValue="4" min="2" max="12" type="number" className="h-11 border border-stone-300 bg-white px-3" /></label>{error && <p className="text-sm text-red-700">{error}</p>}<button className="h-11 w-fit border border-stone-900 bg-stone-900 px-5 text-sm text-stone-50">Create team</button></form></main>;
}
