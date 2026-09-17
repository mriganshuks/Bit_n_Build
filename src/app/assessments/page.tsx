"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";

type Skill = {
  name: string;
  status: string;
  assessmentScore?: number;
};

type Profile = {
  skills: Skill[];
};

export default function AssessmentsPage() {
  const router = useRouter();
  const { authState, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await apiFetch<{ skills: Skill[] }>("/api/assessments");
      setProfile({ skills: body.skills });
    } catch (err) {
      try {
        const fallback = await apiFetch<{ profile: Profile }>("/api/profile");
        setProfile(fallback.profile);
      } catch {
        setProfile(null);
        setError(err instanceof Error ? err.message : "Unable to load skills.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && authState === "UNAUTHENTICATED") {
      router.replace("/login");
    }
  }, [authLoading, authState, router]);

  useEffect(() => {
    if (authLoading || authState === "UNAUTHENTICATED") return;
    void Promise.resolve().then(() => load());
  }, [authLoading, authState, load]);

  if (authLoading || authState === "UNAUTHENTICATED" || (authState === "AUTHENTICATED" && loading && !profile)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">
        Loading…
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-stone-900">Create a profile before taking an assessment</h1>
        <p className="mt-3 text-sm text-stone-600">
          {error ?? "Your assessment record is tied to your PRAMAAN profile."}
        </p>
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

  if (!profile.skills.length) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessments</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Claim a skill first</h1>
        <p className="mt-3 text-sm text-stone-600">
          Assessments verify skills you have actually added to your profile.
        </p>
        <Link
          href="/skills"
          className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Add skills
        </Link>
      </main>
    );
  }

  const skills = profile.skills;
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessments</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Technical proof, one skill at a time
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Each attempt is timed on the server and stores its generated questions and integrity events for audit.
      </p>

      <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {skills.map((skill) => (
          <article
            key={skill.name}
            className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="font-medium text-stone-900">{skill.name}</h2>
              <p className="mt-1 text-sm text-stone-600">
                Five MCQs · coding submission · 28 minutes · current status:{" "}
                {skill.status.replaceAll("_", " ").toLowerCase()}
              </p>
            </div>
            <Link
              href={`/assessments/${encodeURIComponent(skill.name)}`}
              className="inline-flex h-10 items-center border border-stone-900 px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
            >
              Start assessment
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
