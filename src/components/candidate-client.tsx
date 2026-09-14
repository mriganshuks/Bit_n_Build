"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: Array<{ name: string; status: string; assessmentScore?: number; evidenceCount: number }>;
  projects: Array<{ _id: string; title: string; description: string }>;
  evidence: Array<{ _id: string; source: string; url: string }>;
};
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function CandidateClient({ candidateId, teamId }: { candidateId: string; teamId?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [challengeSkill, setChallengeSkill] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/profiles/${candidateId}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load candidate.");
      setProfile(body.profile);
    }).catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load candidate."));
  }, [candidateId]);

  async function sendChallenge() {
    if (!teamId || !challengeSkill) return;
    try {
      const response = await fetch(`/api/teams/${teamId}/challenges`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateId, skill: challengeSkill }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to create challenge.");
      setNotice(`Challenge sent. In the candidate’s local profile session, open /challenge/${body.challenge.id} to complete it.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to create challenge."); }
  }

  if (!profile) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">{error ?? "Loading candidate…"}</main>;
  return <main className="mx-auto w-full max-w-5xl px-6 py-10"><Link href="/team" className="text-sm underline underline-offset-4">Back to team workspace</Link><p className="mt-9 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Candidate profile</p><h1 className="mt-3 text-3xl font-semibold">{profile.displayName}</h1><p className="mt-2 text-lg text-stone-700">{profile.headline || "PRAMAAN participant"}</p><p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">{profile.bio || "No bio provided."}</p><section className="mt-10 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill record</p><div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">{profile.skills.map((skill) => <div key={skill.name} className="grid grid-cols-[1fr_auto] gap-4 py-4 text-sm"><div><p className="font-medium">{skill.name}</p><p className="mt-1 text-stone-600">{skill.assessmentScore === undefined ? "No assessment result" : `Assessment ${skill.assessmentScore}%`} · {skill.evidenceCount} evidence item{skill.evidenceCount === 1 ? "" : "s"}</p></div><p className="font-medium">{label(skill.status)}</p></div>)}</div></div><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Projects and links</p><div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">{profile.projects.map((project) => <article key={project._id} className="py-4"><p className="font-medium">{project.title}</p><p className="mt-1 text-sm text-stone-600">{project.description}</p></article>)}{profile.evidence.map((item) => <article key={item._id} className="py-4"><p className="font-medium">{item.source}</p><a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline">Open evidence</a></article>)}</div></div></section>{teamId && <section className="mt-10 border-t border-stone-300 pt-8"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill challenge</p><h2 className="mt-2 text-2xl font-semibold">Validate a specific skill</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">A team can send a short challenge before deciding whether to form a team. Results show skill score and assessment-integrity risk; risk signals are not proof of cheating.</p><div className="mt-5 flex max-w-md gap-3"><select value={challengeSkill} onChange={(event) => setChallengeSkill(event.target.value)} className="h-10 min-w-0 flex-1 border border-stone-300 bg-white px-3 text-sm"><option value="">Choose a claimed skill</option>{profile.skills.map((skill) => <option key={skill.name} value={skill.name}>{skill.name}</option>)}</select><button onClick={() => void sendChallenge()} disabled={!challengeSkill} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50 disabled:opacity-50">Send challenge</button></div>{notice && <p className="mt-4 text-sm text-emerald-800">{notice}</p>}</section>}{error && <p className="mt-5 text-sm text-red-700">{error}</p>}</main>;
}
