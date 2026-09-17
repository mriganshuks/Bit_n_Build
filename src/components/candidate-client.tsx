"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api-client";

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
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ profile: Profile }>(`/api/profiles/${candidateId}`)
      .then((body) => setProfile(body.profile))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load candidate."));
  }, [candidateId]);

  async function sendChallenge() {
    if (!teamId || !challengeSkill || sendingChallenge) return;
    setSendingChallenge(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch<{ challenge: { id: string } }>(`/api/teams/${teamId}/challenges`, {
        method: "POST",
        body: JSON.stringify({ candidateId, skill: challengeSkill }),
      });
      setNotice(`Challenge sent. The candidate can now view and complete this challenge.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create challenge.");
    } finally {
      setSendingChallenge(false);
    }
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">
        {error ?? "Loading candidate…"}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link href="/team" className="text-sm underline underline-offset-4 hover:text-stone-700 transition-colors">
        Back to team workspace
      </Link>
      <p className="mt-9 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Candidate profile
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">{profile.displayName}</h1>
      <p className="mt-2 text-lg text-stone-700">{profile.headline || "PRAMAAN participant"}</p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
        {profile.bio || "No bio provided."}
      </p>

      <section className="mt-10 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Skill record
          </p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {profile.skills.map((skill) => (
              <div key={skill.name} className="grid grid-cols-[1fr_auto] gap-4 py-4 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{skill.name}</p>
                  <p className="mt-1 text-stone-600">
                    {skill.assessmentScore === undefined
                      ? "No assessment result"
                      : `Assessment ${skill.assessmentScore}%`}{" "}
                    · {skill.evidenceCount} evidence item{skill.evidenceCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="font-medium text-stone-900">{label(skill.status)}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Projects and links
          </p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {profile.projects.map((project) => (
              <article key={project._id} className="py-4">
                <p className="font-medium text-stone-900">{project.title}</p>
                <p className="mt-1 text-sm text-stone-600">{project.description}</p>
              </article>
            ))}
            {profile.evidence.map((item) => (
              <article key={item._id} className="py-4">
                <p className="font-medium text-stone-900">{item.source}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm underline hover:text-stone-700 transition-colors"
                >
                  Open evidence
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {teamId && (
        <section className="mt-10 border-t border-stone-300 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Skill challenge
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Validate a specific skill</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            A team can send a short challenge before deciding whether to form a team. Results show
            skill score and assessment-integrity risk; risk signals are not proof of cheating.
          </p>
          <div className="mt-5 flex max-w-md gap-3">
            <select
              value={challengeSkill}
              onChange={(event) => setChallengeSkill(event.target.value)}
              className="h-10 min-w-0 flex-1 border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
            >
              <option value="">Choose a claimed skill</option>
              {profile.skills.map((skill) => (
                <option key={skill.name} value={skill.name}>
                  {skill.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void sendChallenge()}
              disabled={!challengeSkill || sendingChallenge}
              className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {sendingChallenge ? "Sending…" : "Send challenge"}
            </button>
          </div>
          {notice && (
            <div className="mt-4 flex items-center justify-between border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>
      )}
      {error && (
        <div className="mt-5 flex items-center justify-between border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}
    </main>
  );
}
