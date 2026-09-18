"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getHandleRequirements, getHandleValidationError } from "@/lib/handle-validation";

export default function OnboardingPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, signIn, isConfigured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const handleRequirements = getHandleRequirements(handle);
  const handleFormatError = getHandleValidationError(handle);

  // If user already has a completed profile, redirect to dashboard
  useEffect(() => {
    if (!authLoading && profile) {
      router.push("/dashboard");
    }
  }, [authLoading, profile, router]);

  // Debounced handle availability check (only when format is fully valid)
  useEffect(() => {
    if (!handleRequirements.allValid) {
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const res = await fetch(`/api/profiles?handle=${encodeURIComponent(handle)}`);
        const data = await res.json();
        if (!res.ok || !data.available) {
          setIsAvailable(false);
          setAvailabilityError(data.error ?? "This public handle is already taken. Try another one.");
        } else {
          setIsAvailable(true);
          setAvailabilityError(null);
        }
      } catch {
        // Network failure should not lock out format validation
      } finally {
        setCheckingAvailability(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [handle, handleRequirements.allValid]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHandleTouched(true);

    if (handleFormatError) {
      setError(handleFormatError);
      return;
    }

    if (availabilityError) {
      setError(availabilityError);
      return;
    }

    if (isAvailable === false) {
      setError("This public handle is already taken. Try another one.");
      return;
    }

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
          handle: handle,
          headline: form.get("headline"),
          location: form.get("location"),
          photoUrl: firebaseUser?.photoURL || undefined,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        const handleErr = body.error?.fields?.handle?.[0];
        const errorMsg = handleErr ?? body.error?.message ?? "Unable to create profile.";
        if (body.error?.code === "HANDLE_CONFLICT" || errorMsg.includes("already taken")) {
          setAvailabilityError(errorMsg);
          setIsAvailable(false);
        }
        throw new Error(errorMsg);
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

        <div className="grid gap-2 text-sm font-medium">
          <label htmlFor="handle-input">Public Handle</label>
          <input
            id="handle-input"
            name="handle"
            required
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setIsAvailable(null);
              setAvailabilityError(null);
              if (!handleTouched) setHandleTouched(true);
            }}
            onBlur={() => setHandleTouched(true)}
            placeholder="ada_lovelace"
            className="h-11 border border-stone-300 bg-white px-3 lowercase"
          />

          {/* Dynamic specific error message if invalid */}
          {handleTouched && handle.length > 0 && handleFormatError && (
            <p className="text-xs font-medium text-red-700">{handleFormatError}</p>
          )}

          {/* Availability status message when format is valid */}
          {handleRequirements.allValid && (
            <>
              {checkingAvailability && (
                <p className="text-xs text-stone-500">Checking availability…</p>
              )}
              {!checkingAvailability && isAvailable && (
                <p className="text-xs font-medium text-emerald-700">✓ Public handle is available.</p>
              )}
              {!checkingAvailability && availabilityError && (
                <p className="text-xs font-medium text-red-700">{availabilityError}</p>
              )}
            </>
          )}

          {/* Requirements indicators dynamically updating as user types */}
          <div className="mt-1 flex flex-col gap-1 border-t border-stone-200 pt-2 text-xs">
            <p className="font-medium text-stone-600">Requirements:</p>
            <div className="grid gap-1 pl-0.5">
              <div
                className={`flex items-center gap-1.5 ${
                  handleRequirements.lengthValid
                    ? "text-emerald-700 font-medium"
                    : handleTouched && handle.length > 0
                    ? "text-red-700 font-medium"
                    : "text-stone-500"
                }`}
              >
                <span>{handleRequirements.lengthValid ? "✓" : "✗"}</span>
                <span>3–18 characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  handleRequirements.lowercaseValid
                    ? "text-emerald-700 font-medium"
                    : handleTouched && handle.length > 0
                    ? "text-red-700 font-medium"
                    : "text-stone-500"
                }`}
              >
                <span>{handleRequirements.lowercaseValid ? "✓" : "✗"}</span>
                <span>lowercase letters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  handleRequirements.numbersValid
                    ? "text-emerald-700 font-medium"
                    : handleTouched && handle.length > 0
                    ? "text-red-700 font-medium"
                    : "text-stone-500"
                }`}
              >
                <span>{handleRequirements.numbersValid ? "✓" : "✗"}</span>
                <span>numbers</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  handleRequirements.noSpacesOrUnsupported
                    ? "text-emerald-700 font-medium"
                    : "text-red-700 font-medium"
                }`}
              >
                <span>{handleRequirements.noSpacesOrUnsupported ? "✓" : "✗"}</span>
                <span>
                  {handleRequirements.noSpacesOrUnsupported
                    ? "no spaces or unsupported characters"
                    : "spaces or unsupported characters"}
                </span>
              </div>
            </div>
          </div>
        </div>

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
