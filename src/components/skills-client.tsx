"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, ClientApiError } from "@/lib/api-client";

type Skill = {
  name: string;
  status: string;
  assessmentScore?: number;
  evidenceCount: number;
};

type Profile = {
  skills: Skill[];
};

const label = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function SkillsClient() {
  const { authState, loading: authLoading, signIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await apiFetch<{ profile: Profile }>("/api/profile");
      setProfile(body.profile);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Unable to load skills.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || authState === "UNAUTHENTICATED") return;
    void Promise.resolve().then(() => load());
  }, [authLoading, authState, load]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const skillInput = form.get("name");
    if (!skillInput || typeof skillInput !== "string" || !skillInput.trim()) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const body = await apiFetch<{ profile: Profile; message?: string }>("/api/profile/skills", {
        method: "POST",
        body: JSON.stringify({ name: skillInput.trim() }),
      });
      setProfile(body.profile);
      formElement.reset();
      setNotice(body.message ?? "Skill added successfully.");
    } catch (err) {
      if (err instanceof ClientApiError && (err.code === "SKILL_EXISTS" || err.status === 409)) {
        setError("Skill already acquired.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to add skill.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const [confirmingSkill, setConfirmingSkill] = useState<string | null>(null);
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

  async function remove(name: string) {
    setRemovingSkill(name);
    setConfirmingSkill(null);
    setError(null);
    setNotice(null);
    try {
      const body = await apiFetch<{ profile: Profile }>(
        `/api/profile/skills?name=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );
      setProfile(body.profile);
      setNotice(`Removed ${name} from your skills.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove skill.");
    } finally {
      setRemovingSkill(null);
    }
  }

  if (authLoading || (authState === "AUTHENTICATED" && loading && !profile)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">
        Loading skills…
      </main>
    );
  }

  if (authState === "UNAUTHENTICATED") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skills</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Sign in to manage your skills</h1>
        <p className="mt-3 text-sm text-stone-600">
          Sign in with Google to claim technical skills, submit traceable evidence, and prepare for assessments.
        </p>
        <button
          type="button"
          onClick={() => void signIn()}
          className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skills</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Profile required</h1>
        <p className="mt-3 text-sm text-stone-600">{error ?? "Create your profile to claim and verify skills."}</p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/onboarding"
            className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Create profile
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center border border-stone-400 px-4 text-sm font-medium text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skills</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">Claims with proof</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Self-claims remain claims. Only assessment results and supporting evidence can change a verification status.
      </p>

      {notice && (
        <div className="mt-4 border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-center justify-between">
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
        <div className="mt-4 border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
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

      <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {profile.skills.map((skill) => (
          <div
            key={skill.name}
            className="grid gap-2 py-5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6"
          >
            <div>
              <p className="font-medium text-stone-900">{skill.name}</p>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-xs font-medium text-stone-700">{label(skill.status)}</span>
                <Link
                  href={`/assessments/${encodeURIComponent(skill.name)}`}
                  className="text-xs text-stone-500 hover:text-stone-900 underline transition-colors"
                  title={`Take ${skill.name} assessment`}
                >
                  Take assessment →
                </Link>
              </div>
            </div>
            <p className="text-sm text-stone-600">
              {skill.assessmentScore === undefined ? "No assessment" : `${skill.assessmentScore}%`}
            </p>
            <p className="text-sm text-stone-600">
              {skill.evidenceCount} evidence item{skill.evidenceCount === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-3">
              {confirmingSkill === skill.name ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-600">Remove?</span>
                  <button
                    type="button"
                    disabled={removingSkill === skill.name}
                    onClick={() => void remove(skill.name)}
                    className="font-medium text-red-700 hover:text-red-900 underline disabled:opacity-50"
                  >
                    {removingSkill === skill.name ? "Removing…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingSkill(null)}
                    className="text-stone-500 hover:text-stone-800 underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={removingSkill === skill.name}
                  onClick={() => setConfirmingSkill(skill.name)}
                  className="text-sm text-stone-500 underline hover:text-stone-900 transition-colors disabled:opacity-50"
                >
                  {removingSkill === skill.name ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          </div>
        ))}
        {profile.skills.length === 0 && (
          <div className="py-8">
            <p className="text-sm font-medium text-stone-800">No skills claimed yet</p>
            <p className="mt-1 text-xs text-stone-500">
              Claiming a technical skill enables you to take assessments, attach verified evidence, and match with teams.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={add} className="mt-6 flex max-w-lg gap-3">
        <label className="sr-only" htmlFor="skill-name">
          Skill name
        </label>
        <input
          id="skill-name"
          name="name"
          required
          minLength={1}
          disabled={submitting}
          placeholder="e.g. JavaScript, C++, Python"
          className="h-11 min-w-0 flex-1 border border-stone-300 bg-white px-3 text-stone-900 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add skill"}
        </button>
      </form>
    </main>
  );
}
