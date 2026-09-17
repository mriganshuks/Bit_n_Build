"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { authState, loading, profile, firebaseUser, signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated =
    authState === "AUTHENTICATED" || (!loading && (Boolean(profile) || Boolean(firebaseUser)));

  // If already authenticated and visits /login, redirect to /dashboard (or /onboarding if profile is incomplete)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (!profile) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, profile, router]);

  async function handleGoogleSignIn() {
    if (submitting) return;
    setSubmitting(true);
    setAuthError(null);
    try {
      await signIn();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && isAuthenticated && !authError) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Redirecting to dashboard…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        PRAMAAN Authentication
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
        Sign in to your account
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        Connect your verified identity to access your dashboard, skill portfolio, team workspaces, and hackathons.
      </p>

      {authError && (
        <div className="mt-6 border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {authError}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 border-t border-stone-300 pt-8">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          {submitting ? "Signing in…" : "Sign in with Google"}
        </button>

        <Link
          href="/onboarding"
          className="inline-flex h-11 items-center justify-center border border-stone-300 px-5 text-sm font-medium text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          Create local profile
        </Link>
      </div>
    </main>
  );
}
