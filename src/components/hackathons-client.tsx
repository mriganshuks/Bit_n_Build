"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";

type Hackathon = {
  id: string;
  name: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  joined: boolean;
  participantCount: number;
};

export default function HackathonsClient() {
  const { authState, loading: authLoading, signIn } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const body = await apiFetch<{ hackathons: Hackathon[] }>("/api/hackathons");
      setHackathons(body.hackathons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load hackathons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || authState === "UNAUTHENTICATED") return;
    void Promise.resolve().then(() => reload());
  }, [authLoading, authState, reload]);

  async function join(id: string) {
    if (joiningId) return;
    setJoiningId(id);
    setError(null);
    try {
      await apiFetch(`/api/hackathons/${id}/join`, { method: "POST" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join hackathon.");
    } finally {
      setJoiningId(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await apiFetch("/api/hackathons", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          location: form.get("location"),
          startsAt: form.get("startsAt"),
          endsAt: form.get("endsAt"),
        }),
      });
      formElement?.reset();
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create hackathon.");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || (authState === "AUTHENTICATED" && loading && !hackathons.length && !error)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10 text-sm text-stone-600">
        Loading hackathons…
      </main>
    );
  }

  if (authState === "UNAUTHENTICATED") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Hackathons</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Sign in to explore hackathons</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          Join hackathons, form verified teams, and discover builders with the exact technical skills your project needs.
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

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Hackathons</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Build where your proof matters
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Join a hackathon, then make a team with clear needs and discover candidates by their actual verification evidence.
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="h-10 border border-stone-900 px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
        >
          {showForm ? "Cancel" : "Create hackathon"}
        </button>
      </div>

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

      {showForm && (
        <form onSubmit={create} className="mt-8 grid gap-4 border-y border-stone-300 py-6 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-stone-900">
            Name
            <input
              required
              name="name"
              className="h-10 border border-stone-300 bg-white px-3 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-stone-900">
            Location
            <input
              required
              name="location"
              className="h-10 border border-stone-300 bg-white px-3 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-stone-900 md:col-span-2">
            Description
            <textarea
              required
              minLength={10}
              name="description"
              className="min-h-20 border border-stone-300 bg-white p-3 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-stone-900">
            Starts
            <input
              required
              type="datetime-local"
              name="startsAt"
              className="h-10 border border-stone-300 bg-white px-3 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-stone-900">
            Ends
            <input
              required
              type="datetime-local"
              name="endsAt"
              className="h-10 border border-stone-300 bg-white px-3 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="h-10 w-fit border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-60 transition-colors"
          >
            {creating ? "Creating…" : "Create and join"}
          </button>
        </form>
      )}

      <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {hackathons.map((hackathon) => (
          <article
            key={hackathon.id}
            className="flex flex-col justify-between gap-5 py-6 transition-colors hover:bg-stone-50/50 sm:flex-row sm:items-start"
          >
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{hackathon.name}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {hackathon.location} · {new Date(hackathon.startsAt).toLocaleDateString()}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                {hackathon.description}
              </p>
              <p className="mt-3 text-xs text-stone-500">
                {hackathon.participantCount} participant{hackathon.participantCount === 1 ? "" : "s"}
              </p>
            </div>
            {hackathon.joined ? (
              <Link
                href={`/teams/new?hackathon=${hackathon.id}`}
                className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800 transition-colors"
              >
                Create a team
              </Link>
            ) : (
              <button
                type="button"
                disabled={joiningId === hackathon.id}
                onClick={() => void join(hackathon.id)}
                className="h-10 border border-stone-900 px-4 text-sm font-medium text-stone-900 hover:bg-stone-100 disabled:opacity-60 transition-colors"
              >
                {joiningId === hackathon.id ? "Joining…" : "Join hackathon"}
              </button>
            )}
          </article>
        ))}
        {hackathons.length === 0 && (
          <p className="py-6 text-sm text-stone-600">
            No hackathons yet. Create the first one for your community.
          </p>
        )}
      </div>
    </main>
  );
}
