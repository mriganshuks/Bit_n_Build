"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";

type Profile = {
  id: string;
  displayName: string;
  email: string;
  handle: string;
  headline: string;
  bio: string;
  location: string;
  education: string;
  availableForTeams: boolean;
  skills: Array<{ name: string; status: string; assessmentScore?: number; evidenceCount: number }>;
  projects: Array<{ _id: string; title: string; description: string; url?: string; skills: string[] }>;
  evidence: Array<{ _id: string; source: string; url: string; description: string; skills: string[] }>;
};

export default function ProfileClient() {
  const { authState, loading: authLoading, signIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { profile: loaded } = await apiFetch<{ profile: Profile }>("/api/profile");
      setProfile(loaded);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Unable to load profile.");
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    try {
      const { profile: updated } = await apiFetch<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.get("displayName"),
          headline: form.get("headline"),
          bio: form.get("bio"),
          location: form.get("location"),
          education: form.get("education"),
          availableForTeams: form.get("availableForTeams") === "on",
        }),
      });
      setProfile(updated);
      setNotice("Profile saved.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    }
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const { profile: updated } = await apiFetch<{ profile: Profile }>("/api/profile/projects", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          url: form.get("url"),
          skills: String(form.get("skills") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      setProfile(updated);
      formElement?.reset();
      setNotice("Project evidence added.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add project.");
    }
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const { profile: updated } = await apiFetch<{ profile: Profile }>("/api/profile/evidence", {
        method: "POST",
        body: JSON.stringify({
          source: form.get("source"),
          url: form.get("url"),
          description: form.get("description"),
          skills: String(form.get("skills") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      setProfile(updated);
      formElement?.reset();
      setNotice("External evidence added. PRAMAAN records it as supporting evidence.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add evidence.");
    }
  }

  if (authLoading || (loading && !profile)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10 text-sm text-stone-600">
        Loading your profile…
      </main>
    );
  }

  if (authState === "UNAUTHENTICATED") {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Sign in to view your profile</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          Sign in with Google to maintain your verified technical portfolio, attach external project proof, and configure hackathon discovery.
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
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Create your profile first</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          {error ?? "You need a registered PRAMAAN profile to attach evidence and configure team availability."}
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/onboarding"
            className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
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
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Profile</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">Evidence with context</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Your verified technical portfolio is linked to your Google identity and backed by verifiable code and assessment proofs.
      </p>

      {notice && (
        <p className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={save} className="mt-10 grid gap-5 border-t border-stone-300 pt-8 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-stone-900">
          Name
          <input
            name="displayName"
            required
            defaultValue={profile.displayName}
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-900">
          Headline
          <input
            name="headline"
            defaultValue={profile.headline}
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-900">
          Location
          <input
            name="location"
            defaultValue={profile.location}
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-900">
          Education
          <input
            name="education"
            defaultValue={profile.education}
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-900 md:col-span-2">
          Bio
          <textarea
            name="bio"
            defaultValue={profile.bio}
            className="min-h-28 border border-stone-300 bg-white p-3"
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-stone-900">
          <input
            type="checkbox"
            name="availableForTeams"
            defaultChecked={profile.availableForTeams}
          />
          Available for team discovery
        </label>
        <div className="md:col-span-2">
          <button className="h-11 w-fit border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800">
            Save profile
          </button>
        </div>
      </form>

      <section className="mt-12 grid gap-10 border-t border-stone-300 pt-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Projects</p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {profile.projects.map((project) => (
              <article key={project._id} className="py-4">
                <p className="font-medium text-stone-900">{project.title}</p>
                <p className="mt-1 text-sm text-stone-600">{project.description}</p>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-stone-800 underline hover:text-stone-950"
                  >
                    View project
                  </a>
                )}
              </article>
            ))}
            {profile.projects.length === 0 && (
              <p className="py-4 text-sm text-stone-600">No project evidence yet.</p>
            )}
          </div>
          <form onSubmit={addProject} className="mt-5 grid gap-3">
            <input
              name="title"
              required
              placeholder="Project title"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            />
            <textarea
              name="description"
              required
              minLength={10}
              placeholder="What did you build?"
              className="min-h-20 border border-stone-300 bg-white p-3 text-sm text-stone-900"
            />
            <input
              name="url"
              type="url"
              placeholder="Project URL (optional)"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            />
            <input
              name="skills"
              placeholder="Skills, comma-separated"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            />
            <button className="h-10 w-fit border border-stone-900 px-4 text-sm hover:bg-stone-100">
              Add project
            </button>
          </form>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            External evidence
          </p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {profile.evidence.map((item) => (
              <article key={item._id} className="py-4">
                <p className="font-medium text-stone-900">{item.source}</p>
                <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-stone-800 underline hover:text-stone-950"
                >
                  Open submitted link
                </a>
              </article>
            ))}
            {profile.evidence.length === 0 && (
              <p className="py-4 text-sm text-stone-600">No external evidence yet.</p>
            )}
          </div>
          <form onSubmit={addEvidence} className="mt-5 grid gap-3">
            <select
              name="source"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            >
              <option value="GITHUB">GitHub</option>
              <option value="LEETCODE">LeetCode</option>
              <option value="CODECHEF">CodeChef</option>
              <option value="HACKERRANK">HackerRank</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              name="url"
              type="url"
              required
              placeholder="Public evidence URL"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            />
            <input
              name="description"
              required
              minLength={4}
              placeholder="Why this is relevant"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            />
            <input
              name="skills"
              placeholder="Skills, comma-separated"
              className="h-10 border border-stone-300 bg-white px-3 text-sm text-stone-900"
            />
            <button className="h-10 w-fit border border-stone-900 px-4 text-sm hover:bg-stone-100">
              Add evidence
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
