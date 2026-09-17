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
    setLoading(true);
    setError(null);
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
    if (authLoading) return;
    if (authState === "UNAUTHENTICATED") {
      setLoading(false);
      setProfile(null);
      return;
    }
    void load();
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

  async function remove(name: string) {
    setError(null);
    setNotice(null);
    try {
      const body = await apiFetch<{ profile: Profile }>(
        `/api/profile/skills?name=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );
      setProfile(body.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove skill.");
    }
  }

  if (authLoading || (loading && !profile)) {
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
          className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
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
            className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
          >
            Create profile
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center border border-stone-400 px-4 text-sm font-medium text-stone-800 hover:bg-stone-100"
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
        <div className="mt-4 border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {profile.skills.map((skill) => (
          <div
            key={skill.name}
            className="grid gap-2 py-5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6"
          >
            <p className="font-medium text-stone-900">{skill.name}</p>
            <p className="text-sm text-stone-600">
              {skill.assessmentScore === undefined ? "No assessment" : `${skill.assessmentScore}%`}
            </p>
            <p className="text-sm text-stone-600">
              {skill.evidenceCount} evidence item{skill.evidenceCount === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-stone-900">{label(skill.status)}</p>
              <button
                type="button"
                onClick={() => void remove(skill.name)}
                className="text-sm text-stone-500 underline hover:text-stone-900"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {profile.skills.length === 0 && (
          <p className="py-5 text-sm text-stone-600">
            Add a skill to begin building a verifiable profile.
          </p>
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
          placeholder="e.g. JavaScript"
          className="h-11 min-w-0 flex-1 border border-stone-300 bg-white px-3 text-stone-900 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add skill"}
        </button>
      </form>
    </main>
  );
}
