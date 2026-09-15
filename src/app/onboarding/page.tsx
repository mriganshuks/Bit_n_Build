"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function OnboardingPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, signIn, isConfigured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // If user already has a completed profile, redirect to dashboard
  useEffect(() => {
    if (!authLoading && profile) {
      router.push("/dashboard");
    }
  }, [authLoading, profile, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          email: form.get("email"),
          handle: form.get("handle"),
          headline: form.get("headline"),
          location: form.get("location"),
          photoUrl: firebaseUser?.photoURL || undefined,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Unable to create profile.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create profile.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-14">
        <p className="text-sm text-stone-600">Checking authentication…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-14">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Account Onboarding
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Create your PRAMAAN profile
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        Connect your identity to a verified technical profile. Claim skills, attach traceable project evidence, and prove your capabilities through proctored assessments.
      </p>

      {/* Google Authentication Prompt if not yet signed in */}
      {!firebaseUser && isConfigured && (
        <div className="mt-8 border border-stone-300 bg-stone-100 p-5">
          <p className="text-sm font-medium text-stone-900">
            Sign in with Google to link your account
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Using Google Sign-In gives you persistent cross-session access to your verified skills and team workspaces.
          </p>
          <button
            type="button"
            onClick={() => void signIn()}
            className="mt-4 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {firebaseUser && (
        <div className="mt-6 flex items-center gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {firebaseUser.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firebaseUser.photoURL}
              alt=""
              className="h-8 w-8 rounded-full border border-emerald-300 object-cover"
            />
          )}
          <div>
            <p className="font-medium">Signed in as {firebaseUser.displayName || firebaseUser.email}</p>
            <p className="text-xs text-emerald-700">Your profile will be securely tied to this Google account.</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 grid gap-5 border-t border-stone-300 pt-8">
        <label className="grid gap-2 text-sm font-medium">
          Full Name
          <input
            name="displayName"
            required
            minLength={2}
            defaultValue={firebaseUser?.displayName ?? ""}
            placeholder="Ada Lovelace"
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Email Address
          <input
            name="email"
            type="email"
            required
            defaultValue={firebaseUser?.email ?? ""}
            readOnly={Boolean(firebaseUser?.email)}
            placeholder="ada@example.com"
            className={`h-11 border border-stone-300 bg-white px-3 ${
              firebaseUser?.email ? "bg-stone-100 text-stone-600 cursor-not-allowed" : ""
            }`}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Public Handle
          <input
            name="handle"
            required
            pattern="[a-z0-9_]{3,32}"
            placeholder="ada_lovelace"
            className="h-11 border border-stone-300 bg-white px-3 lowercase"
          />
          <span className="text-xs font-normal text-stone-500">
            3–32 characters, lowercase letters, numbers, and underscores only.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Headline (optional)
          <input
            name="headline"
            maxLength={120}
            placeholder="e.g. Distributed Systems Engineer & Hackathon Builder"
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Location (optional)
          <input
            name="location"
            maxLength={100}
            placeholder="e.g. San Francisco, CA or Remote"
            className="h-11 border border-stone-300 bg-white px-3"
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? "Creating profile…" : "Complete Onboarding"}
        </button>
      </form>
    </main>
  );
}
