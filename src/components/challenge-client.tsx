"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
/* eslint-disable react-hooks/exhaustive-deps -- lifecycle listeners intentionally stay bound to one active challenge. */

import { apiFetch } from "@/lib/api-client";

type Question = {
  id: string;
  prompt: string;
  topic: string;
  options: Array<{ id: "A" | "B" | "C" | "D"; text: string }>;
};
type Challenge = {
  id: string;
  teamId: string;
  skill: string;
  state: string;
  score?: number;
  integrity: { score: number; riskLevel: string; eventCount: number } | null;
  expiresAt: string | null;
  decision?: string;
  canDecide?: boolean;
  questions?: Question[];
};
type IntegrityType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "FULLSCREEN_EXIT"
  | "CAMERA_DISABLED"
  | "MICROPHONE_DISABLED"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "REPEATED_SUBMISSION";

const readable = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ChallengeClient({ id }: { id: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<"REQUIRED" | "ACTIVE" | "UNAVAILABLE">("REQUIRED");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recentEvents = useRef(new Map<string, number>());

  const refresh = async () => {
    const body = await apiFetch<{ challenge: Challenge }>(`/api/challenges/${id}`);
    setChallenge(body.challenge);
    return body.challenge;
  };

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const recordIntegrity = async (type: IntegrityType, severity: "LOW" | "MEDIUM" | "HIGH") => {
    const now = Date.now();
    if (now - (recentEvents.current.get(type) ?? 0) < 2_000) return;
    recentEvents.current.set(type, now);
    try {
      await apiFetch(`/api/challenges/${id}/integrity`, {
        method: "POST",
        body: JSON.stringify({ events: [{ type, severity, timestamp: new Date().toISOString() }] }),
      });
    } catch {
      // A temporary telemetry failure must never interrupt a submitted challenge.
    }
  };

  useEffect(() => {
    void Promise.resolve().then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load challenge.")).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => () => stopMedia(), []);

  useEffect(() => {
    if (!streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
  }, [challenge?.state, mediaStatus]);

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot request camera and microphone access.");
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setMediaStatus("ACTIVE");
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setMediaStatus("UNAVAILABLE");
          void recordIntegrity("CAMERA_DISABLED", "HIGH");
        };
      });
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          setMediaStatus("UNAVAILABLE");
          void recordIntegrity("MICROPHONE_DISABLED", "HIGH");
        };
      });

      const body = await apiFetch<{ challenge: Challenge }>(`/api/challenges/${id}/start`, {
        method: "POST",
        body: JSON.stringify({ consent: true }),
      });
      setChallenge(body.challenge);
      setSeconds(Math.max(0, Math.floor((new Date(body.challenge.expiresAt ?? 0).getTime() - Date.now()) / 1000)));
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } catch (cause) {
      stopMedia();
      setMediaStatus("UNAVAILABLE");
      setError(cause instanceof Error ? cause.message : "Camera and microphone access is required to start this challenge.");
    }
  }

  async function submit(timeout = false) {
    if (submitting) {
      void recordIntegrity("REPEATED_SUBMISSION", "LOW");
      return;
    }
    setSubmitting(true);
    try {
      const body = await apiFetch<{ result: unknown }>(`/api/challenges/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers, timeout }),
      });
      stopMedia();
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit challenge.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (challenge?.state !== "IN_PROGRESS" || !challenge.expiresAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(challenge.expiresAt as string).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) void submit(true);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [challenge?.expiresAt, challenge?.state]);

  useEffect(() => {
    if (challenge?.state !== "IN_PROGRESS") return;
    const visibility = () => {
      if (document.hidden) void recordIntegrity("TAB_HIDDEN", "MEDIUM");
    };
    const blur = () => void recordIntegrity("WINDOW_BLUR", "LOW");
    const focus = () => void recordIntegrity("WINDOW_FOCUS", "LOW");
    const fullscreen = () => {
      if (!document.fullscreenElement) void recordIntegrity("FULLSCREEN_EXIT", "MEDIUM");
    };
    const copy = () => void recordIntegrity("COPY_ATTEMPT", "MEDIUM");
    const paste = () => void recordIntegrity("PASTE_ATTEMPT", "MEDIUM");
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", copy);
      document.removeEventListener("paste", paste);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
    };
  }, [challenge?.state]);

  const time = useMemo(
    () => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds]
  );

  if (loading) return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-stone-600">Loading challenge…</main>;
  if (!challenge) return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-700">{error}</main>;

  if (challenge.state === "SENT") {
    return <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill challenge</p><h1 className="mt-3 text-3xl font-semibold">{challenge.skill}</h1><p className="mt-4 text-sm leading-6 text-stone-600">Starting creates a server-enforced deadline. PRAMAAN asks for your camera and microphone so it can report browser-level integrity signals to the team; it does not record or store video or audio.</p>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<button onClick={() => void start()} className="mt-6 h-11 border border-stone-900 bg-stone-900 px-5 text-sm text-stone-50">Allow permissions and start</button></main>;
  }

  if (challenge.state !== "IN_PROGRESS" || !challenge.questions) {
    return <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Challenge result</p><h1 className="mt-3 text-3xl font-semibold">{challenge.skill}</h1><div className="mt-8 grid gap-5 border-y border-stone-300 py-7 sm:grid-cols-3"><div><p className="text-sm text-stone-600">Score</p><p className="mt-1 text-3xl font-semibold">{challenge.score ?? 0}%</p></div><div><p className="text-sm text-stone-600">Integrity</p><p className="mt-1 text-3xl font-semibold">{challenge.integrity?.score ?? "—"}</p></div><div><p className="text-sm text-stone-600">Risk</p><p className="mt-1 text-lg font-semibold">{challenge.integrity ? readable(challenge.integrity.riskLevel) : "—"}</p></div></div><p className="mt-5 text-sm text-stone-600">The team can use this result alongside the candidate profile and evidence. Integrity risk reflects browser signals only; it is not proof of cheating.</p><Link href="/team" className="mt-6 inline-block text-sm underline underline-offset-4">Return to team workspace</Link></main>;
  }

  const question = challenge.questions[index];
  return <main className="mx-auto max-w-3xl px-6 py-10"><header className="flex items-end justify-between gap-4 border-b border-stone-300 pb-5"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill challenge</p><h1 className="mt-2 text-2xl font-semibold">{challenge.skill}</h1></div><p aria-live="polite" className="text-lg font-semibold">{time}</p></header><div className="mt-5 flex items-center justify-between gap-4 text-xs text-stone-600"><span>Integrity monitoring active · camera and microphone metadata only</span><video ref={videoRef} autoPlay muted playsInline className="h-16 w-24 border border-stone-300 bg-stone-100 object-cover" aria-label="Camera preview" /></div><p className="mt-6 text-sm text-stone-600">Question {index + 1} of {challenge.questions.length} · {question.topic}</p><h2 className="mt-4 text-xl font-medium leading-8">{question.prompt}</h2><fieldset className="mt-7 grid gap-3"><legend className="sr-only">Answer choices</legend>{question.options.map((option) => <label key={option.id} className="flex cursor-pointer gap-3 border border-stone-300 bg-white p-4 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((value) => ({ ...value, [question.id]: option.id }))} /><span><strong>{option.id}.</strong> {option.text}</span></label>)}</fieldset>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-7 flex justify-between"><button disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="h-10 border border-stone-400 px-4 text-sm disabled:opacity-40">Previous</button>{index === challenge.questions.length - 1 ? <button disabled={submitting} onClick={() => void submit()} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">{submitting ? "Submitting…" : "Submit challenge"}</button> : <button onClick={() => setIndex((value) => Math.min(challenge.questions!.length - 1, value + 1))} className="h-10 border border-stone-900 px-4 text-sm">Next</button>}</div></main>;
}
