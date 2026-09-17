"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const router = useRouter();
  const { authState, loading, profile, firebaseUser } = useAuth();

  useEffect(() => {
    if (loading) return;
    const isAuthenticated =
      authState === "AUTHENTICATED" || Boolean(profile) || Boolean(firebaseUser);
    if (isAuthenticated) {
      if (!profile) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    } else {
      router.replace("/login");
    }
  }, [loading, authState, profile, firebaseUser, router]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        From verified skills to real opportunities
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
        Prove your skills. Build stronger teams.
      </h1>
      <p className="mt-4 max-w-lg text-base leading-7 text-stone-600">
        PRAMAAN turns skill claims into evidence-backed profiles and helps
        hackathon participants find teammates with verified, complementary
        skills.
      </p>
      <div className="mt-10 flex flex-wrap gap-3 border-t border-stone-300 pt-8">
        <Link
          href="/login"
          className="inline-flex h-11 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Sign in
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex h-11 items-center border border-stone-300 px-5 text-sm font-medium text-stone-800 hover:bg-stone-100"
        >
          Create local profile
        </Link>
      </div>
    </main>
  );
}
