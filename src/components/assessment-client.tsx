"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { canonicalSkillDisplay, normalizeSkillName } from "@/lib/skills";
/* eslint-disable react-hooks/exhaustive-deps -- assessment lifecycle handlers intentionally bind to one active attempt */

type Question = { id: string; prompt: string; topic: string; options: Array<{ id: "A" | "B" | "C" | "D"; text: string }> };
type Attempt = { id: string; skill: string; state: string; questions: Question[]; codingProblem: { title: string; statement: string; constraints: string[]; examples: Array<{ input: string; output: string }>; starterCode: string; language: string }; startedAt: string; expiresAt: string; notice?: string };
type Result = { mcq: { correct: number; total: number; percentage: number }; coding: { status: string; score?: number; message?: string }; integrity: { score: number; riskLevel: string; eventCount: number }; finalScore: number; verificationStatus: string; state: string };
type Props = { skill: string };
const readable = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AssessmentClient({ skill }: Props) {
  const { authState } = useAuth();
  const displaySkill = useMemo(() => canonicalSkillDisplay(skill), [skill]);
  const normalizedSkill = useMemo(() => normalizeSkillName(skill), [skill]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [code, setCode] = useState("");
  const [index, setIndex] = useState(0);
  const [section, setSection] = useState<"MCQ" | "CODE">("MCQ");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const eventTimes = useRef<Record<string, number>>({});
  const attemptRef = useRef<string | null>(null);
  const storageKey = `pramaan_assessment_${normalizedSkill}`;

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
    setMicrophone(false);
  };

  async function signal(type: string, severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM") {
    const id = attemptRef.current;
    if (!id || result) return;
    const now = Date.now();
    if (now - (eventTimes.current[type] ?? 0) < 1500) return;
    eventTimes.current[type] = now;
    try {
      const body = await apiFetch<{ integrity: { riskLevel: string } }>("/api/assessment/integrity", {
        method: "POST",
        body: JSON.stringify({ assessmentId: id, events: [{ type, severity, timestamp: new Date().toISOString() }] })
      });
      setNotice(`Integrity signal recorded. Current risk: ${readable(body.integrity.riskLevel)}.`);
    } catch {
      setNotice("An integrity signal could not be synced. Continue the assessment and check your connection.");
    }
  }

  async function connectMedia() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera and microphone permissions.");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    setCamera(stream.getVideoTracks().some((track) => track.readyState === "live"));
    setMicrophone(stream.getAudioTracks().some((track) => track.readyState === "live"));
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        setCamera(false);
        void signal("CAMERA_DISABLED", "HIGH");
      };
    });
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        setMicrophone(false);
        void signal("MICROPHONE_DISABLED", "HIGH");
      };
    });
    return stream;
  }

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await connectMedia();
      const body = await apiFetch<{ attempt: Attempt }>("/api/assessment/start", {
        method: "POST",
        body: JSON.stringify({ skill: displaySkill, difficulty: "intermediate", consent: true })
      });
      const newAttempt = body.attempt;
      attemptRef.current = newAttempt.id;
      sessionStorage.setItem(storageKey, newAttempt.id);
      setAttempt(newAttempt);
      setCode(newAttempt.codingProblem.starterCode);
      setSeconds(Math.max(0, Math.floor((new Date(newAttempt.expiresAt).getTime() - Date.now()) / 1000)));
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    } catch (err) {
      stopMedia();
      setError(err instanceof Error ? err.message : "Camera and microphone permission are required.");
    } finally {
      setStarting(false);
    }
  }

  async function reconnectMedia() {
    setError(null);
    try {
      await connectMedia();
      if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
      setNotice("Camera and microphone monitoring reconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera and microphone permission are required.");
    }
  }

  async function submit(timeout = false) {
    if (!attempt || submitting || result) return;
    setSubmitting(true);
    try {
      const body = await apiFetch<{ result: Result }>("/api/assessment/submit", {
        method: "POST",
        body: JSON.stringify({ assessmentId: attempt.id, answers, codingSubmission: code, timeout })
      });
      sessionStorage.removeItem(storageKey);
      setResult(body.result);
      stopMedia();
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  const [skillEligible, setSkillEligible] = useState<boolean | null>(null);

  useEffect(() => {
    if (authState !== "AUTHENTICATED") return;
    let isCancelled = false;

    const checkEligibility = async () => {
      try {
        const body = await apiFetch<{ skills: Array<{ name: string; normalizedName?: string }> }>("/api/assessments");
        if (isCancelled) return;
        const norm = normalizedSkill;
        const found = (body.skills ?? []).some(
          (s) => normalizeSkillName(s.normalizedName || s.name) === norm
        );
        setSkillEligible(found);
      } catch {
        // Leave null on error; server-side validation is authoritative
      }
    };

    const resumeExisting = async () => {
      try {
        const savedId = sessionStorage.getItem(storageKey);
        const queryUrl = savedId
          ? `/api/assessment/attempt?id=${encodeURIComponent(savedId)}`
          : `/api/assessment/attempt?skill=${encodeURIComponent(displaySkill)}`;

        const body = await apiFetch<{ attempt?: Attempt }>(queryUrl);
        if (isCancelled) return;

        if (
          !body.attempt ||
          new Date(body.attempt.expiresAt).getTime() <= Date.now() ||
          body.attempt.state !== "IN_PROGRESS"
        ) {
          sessionStorage.removeItem(storageKey);
          return;
        }
        const savedAttempt = body.attempt;
        attemptRef.current = savedAttempt.id;
        sessionStorage.setItem(storageKey, savedAttempt.id);
        setAttempt(savedAttempt);
        setCode(savedAttempt.codingProblem.starterCode);
        setSeconds(Math.max(0, Math.floor((new Date(savedAttempt.expiresAt).getTime() - Date.now()) / 1000)));
        setNotice("Active assessment resumed. Reconnect camera and microphone monitoring to continue.");
      } catch {
        if (!isCancelled) sessionStorage.removeItem(storageKey);
      }
    };

    void checkEligibility();
    void resumeExisting();
    return () => {
      isCancelled = true;
    };
  }, [skill, storageKey, authState]);

  useEffect(() => {
    if (!attempt || result) return;
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) void submit(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result]);

  useEffect(() => {
    if (!attempt || result) return;
    const visibility = () => { if (document.visibilityState === "hidden") void signal("TAB_HIDDEN", "HIGH"); };
    const blur = () => void signal("WINDOW_BLUR");
    const focus = () => void signal("WINDOW_FOCUS", "LOW");
    const fullscreen = () => { if (!document.fullscreenElement) void signal("FULLSCREEN_EXIT"); };
    const copy = () => void signal("COPY_ATTEMPT", "LOW");
    const paste = () => void signal("PASTE_ATTEMPT", "LOW");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", copy);
      document.removeEventListener("paste", paste);
    };
  }, [attempt, result]);

  useEffect(() => () => stopMedia(), []);

  const time = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  if (authState === "LOADING") {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
          <p className="text-sm text-stone-500">Initializing assessment session…</p>
        </div>
      </main>
    );
  }

  if (authState === "UNAUTHENTICATED") {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Authentication Required</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to take assessment</h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          You must be signed in with an active profile to access PRAMAAN skill assessments and record verified credentials.
        </p>
        <div className="mt-6">
          <Link href="/dashboard" className="inline-flex h-11 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800">
            Go to Dashboard &amp; Sign In
          </Link>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessment result</p>
        <h1 className="mt-3 text-3xl font-semibold">{attempt?.skill}</h1>
        <div className="mt-8 grid gap-5 border-y border-stone-300 py-7 sm:grid-cols-4">
          <div><p className="text-sm text-stone-600">Final score</p><p className="mt-1 text-3xl font-semibold">{result.finalScore}%</p></div>
          <div><p className="text-sm text-stone-600">MCQ</p><p className="mt-1 text-3xl font-semibold">{result.mcq.correct}/{result.mcq.total}</p></div>
          <div><p className="text-sm text-stone-600">Integrity</p><p className="mt-1 text-3xl font-semibold">{result.integrity.score}/100</p></div>
          <div><p className="text-sm text-stone-600">Risk</p><p className="mt-1 text-lg font-semibold">{readable(result.integrity.riskLevel)}</p></div>
        </div>
        <p className="mt-6 text-lg font-semibold">{readable(result.verificationStatus)}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Integrity signals indicate assessment risk; they do not establish cheating. {result.coding.status === "UNAVAILABLE" ? result.coding.message : `Secure coding evaluation: ${result.coding.score}%.`}
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">
          Return to dashboard
        </Link>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessment consent</p>
        <h1 className="mt-3 text-3xl font-semibold">Prepare for {displaySkill}</h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          PRAMAAN uses camera and microphone access exclusively for live local status verification and recording auditable telemetry events (such as device disconnects or permission loss). Video and audio streams are never recorded, saved, or uploaded to any server.
        </p>
        <ul className="mt-6 grid gap-2 border-y border-stone-200 py-5 text-sm text-stone-700">
          <li>28 minute server-enforced timer</li>
          <li>Five technical MCQs plus a practical coding challenge</li>
          <li>Answer keys and hidden test suites are strictly server-held</li>
          <li>Loss of focus, tab switching, and permission revocation generate integrity risk signals</li>
        </ul>
        {skillEligible === false && (
          <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Skill not claimed on your profile</p>
            <p className="mt-1">
              You must claim &apos;{displaySkill}&apos; on your profile before you can start an assessment for it.
            </p>
            <Link
              href="/skills"
              className="mt-3 inline-flex h-9 items-center border border-amber-900 bg-amber-900 px-4 text-xs font-medium text-amber-50 hover:bg-amber-800"
            >
              Go to Skills &amp; Claim {displaySkill}
            </Link>
          </div>
        )}
        {error && (
          <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Permission or Start Issue:</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-xs text-red-600">Ensure camera and microphone permissions are set to &apos;Allow&apos; in your browser settings, then click below to retry.</p>
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button type="button" disabled={starting || skillEligible === false} onClick={() => void start()} className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50">
            {starting ? "Requesting permission…" : "Allow permissions and start"}
          </button>
          <Link href="/assessments" className="inline-flex h-11 items-center border border-stone-400 px-5 text-sm text-stone-800 hover:bg-stone-100">
            Cancel
          </Link>
        </div>
      </main>
    );
  }

  const question = attempt.questions[index];
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">PRAMAAN assessment</p>
          <h1 className="mt-2 text-2xl font-semibold">{attempt.skill}</h1>
        </div>
        <div className="grid grid-cols-3 gap-5 text-right text-xs text-stone-600">
          <span>Time<br /><strong className="text-base text-stone-900">{time}</strong></span>
          <span>Camera<br /><strong className="text-stone-900">{camera ? "Active" : "Lost"}</strong></span>
          <span>Mic<br /><strong className="text-stone-900">{microphone ? "Active" : "Lost"}</strong></span>
        </div>
      </header>
      {(!camera || !microphone) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span>Camera and microphone monitoring are not connected.</span>
          <button onClick={() => void reconnectMedia()} className="h-9 border border-amber-900 px-3 text-xs font-medium">Reconnect monitoring</button>
        </div>
      )}
      <div className="mt-4 flex gap-3 border border-stone-300 bg-stone-100 p-3 text-xs text-stone-600">
        <video ref={videoRef} muted playsInline className="h-16 w-24 bg-stone-900 object-cover" aria-label="Live camera preview" />
        <span>Live preview only. Media never leaves this browser; PRAMAAN stores permission and integrity events, not raw recordings.</span>
      </div>
      {attempt.notice && <p className="mt-4 border border-stone-300 p-3 text-sm text-stone-700">{attempt.notice}</p>}
      {notice && <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
      <div className="mt-6 flex gap-5 border-b border-stone-200 text-sm">
        <button onClick={() => setSection("MCQ")} className={section === "MCQ" ? "border-b-2 border-stone-900 pb-3 font-medium" : "pb-3 text-stone-500"}>
          MCQs · {Object.keys(answers).length}/{attempt.questions.length}
        </button>
        <button onClick={() => setSection("CODE")} className={section === "CODE" ? "border-b-2 border-stone-900 pb-3 font-medium" : "pb-3 text-stone-500"}>
          Coding challenge
        </button>
      </div>
      {section === "MCQ" ? (
        <section className="mt-8">
          <div className="flex justify-between text-sm text-stone-600">
            <span>Question {index + 1} of {attempt.questions.length}</span>
            <span>{question.topic}</span>
          </div>
          <h2 className="mt-5 text-xl font-medium leading-8">{question.prompt}</h2>
          <fieldset className="mt-7 grid gap-3">
            <legend className="sr-only">Answer choices</legend>
            {question.options.map((option) => (
              <label key={option.id} className="flex cursor-pointer gap-3 border border-stone-300 bg-white p-4 text-sm hover:bg-stone-100">
                <input type="radio" name={question.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} />
                <span><strong>{option.id}.</strong> {option.text}</span>
              </label>
            ))}
          </fieldset>
          <div className="mt-6 flex justify-between">
            <button disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="h-10 border border-stone-400 px-4 text-sm disabled:opacity-40">Previous</button>
            <button disabled={index === attempt.questions.length - 1} onClick={() => setIndex((value) => Math.min(attempt.questions.length - 1, value + 1))} className="h-10 border border-stone-900 px-4 text-sm disabled:opacity-40">Next</button>
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{attempt.codingProblem.language}</p>
          <h2 className="mt-3 text-2xl font-semibold">{attempt.codingProblem.title}</h2>
          <p className="mt-4 text-sm leading-6 text-stone-700">{attempt.codingProblem.statement}</p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-600">
            {attempt.codingProblem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
          </ul>
          <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Coding submission" className="mt-6 min-h-72 w-full border border-stone-300 bg-stone-950 p-4 font-mono text-sm text-stone-100" />
          <p className="mt-3 text-sm text-stone-600">Code is sent only to the separately configured secure evaluation service on submission. PRAMAAN never executes it in its Next.js server.</p>
        </section>
      )}
      {error && <p className="mt-5 text-sm text-red-700">{error}</p>}
      <div className="mt-8 flex justify-end">
        <button disabled={submitting} onClick={() => void submit()} className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 disabled:opacity-50">
          {submitting ? "Submitting…" : "Submit assessment"}
        </button>
      </div>
    </main>
  );
}
