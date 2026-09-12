"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Option = { id: "A" | "B" | "C" | "D"; text: string };
type Question = { id: string; type: "mcq"; question: string; options: Option[]; topic?: string };
type CodingProblem = { title: string; statement: string; input: string; output: string; constraints: string[]; examples: Array<{ input: string; output: string }>; language: "javascript" };
type Attempt = { assessmentId: string; skill: string; state: string; questions: Question[]; codingProblem: CodingProblem; startedAt: string; expiresAt: string; generatedBy: "gemini" | "fallback"; notice?: string; answers: Record<string, string> };
type Result = { assessmentId: string; skill: string; state: string; mcqScore: number; mcqTotal: number; mcqPercentage: number; codingScore: number | null; integrityScore: number; riskLevel: string; verificationStatus: string; completedAt: string | null; signals: Array<{ type: string; severity: string }>; violationCount: number; cancellationReason?: string };

type Props = { skill: string };
type ConsentState = "notice" | "checking" | "ready";

function readable(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AssessmentClient({ skill }: Props) {
  const [consent, setConsent] = useState<ConsentState>("notice");
  const [cameraActive, setCameraActive] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codingDraft, setCodingDraft] = useState("// Write your JavaScript solution here\n");
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<"mcq" | "coding">("mcq");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const signalCooldownRef = useRef<Record<string, number>>({});

  const currentQuestion = attempt?.questions[index];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = Boolean(attempt && answeredCount === attempt.questions.length);
  const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();

  async function sendSignal(type: string, severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM") {
    if (!attempt || result) return;
    const now = Date.now();
    if (now - (signalCooldownRef.current[type] ?? 0) < 1000) return;
    signalCooldownRef.current[type] = now;
    try {
      const response = await fetch("/api/assessment/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: attempt.assessmentId, events: [{ type, severity }] }),
      });
      const data = (await response.json()) as { result?: Result; cancelled?: boolean; violationCount?: number };
      if (data.cancelled && data.result) {
        setResult(data.result);
        setNotice("Assessment cancelled after three integrity violations.");
        streamRef.current?.getTracks().forEach((track) => track.stop());
        if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen().catch(() => undefined);
      } else if (typeof data.violationCount === "number") {
        setNotice(`Integrity violation recorded (${data.violationCount}/3). Three violations cancel the assessment.`);
      }
    } catch {
      setNotice("Integrity signal could not be synced. The assessment can continue.");
    }
  }

  async function startAssessment() {
    setConsent("checking");
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not provide camera and microphone access.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraActive(stream.getVideoTracks().some((track) => track.readyState === "live"));
      setMicrophoneActive(stream.getAudioTracks().some((track) => track.readyState === "live"));
      stream.getVideoTracks().forEach((track) => { track.onended = () => void sendSignal("CAMERA_DISABLED", "HIGH"); });
      stream.getAudioTracks().forEach((track) => { track.onended = () => void sendSignal("MICROPHONE_DISABLED", "HIGH"); });
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }
      const response = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, difficulty: "intermediate", consent: true }),
      });
      const data = (await response.json()) as { success?: boolean; attempt?: Attempt; error?: { message?: string } };
      if (!response.ok || !data.attempt) throw new Error(data.error?.message ?? "Unable to start the assessment.");
      setAttempt(data.attempt);
      setSecondsLeft(Math.max(0, Math.floor((new Date(data.attempt.expiresAt).getTime() - Date.now()) / 1000)));
      setConsent("ready");
    } catch (startError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setConsent("notice");
      setError(startError instanceof Error ? startError.message : "Camera and microphone permission are required.");
    }
  }

  async function submitAssessment(timeout = false) {
    if (!attempt || submitting || result || (!allAnswered && !timeout)) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: attempt.assessmentId, answers, codingSubmission: codingDraft, timeout }),
      });
      const data = (await response.json()) as { success?: boolean; result?: Result; error?: { message?: string } };
      if (!response.ok || !data.result) throw new Error(data.error?.message ?? "Unable to submit the assessment.");
      setResult(data.result);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen().catch(() => undefined);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit the assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!attempt || result) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) void submitAssessment(true);
    }, 1000);
    return () => window.clearInterval(timer);
    // The handlers intentionally read the latest attempt state during timer ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, result]);

  useEffect(() => {
    if (!attempt || result) return;
    const onVisibility = () => { if (document.visibilityState === "hidden") void sendSignal("TAB_HIDDEN", "HIGH"); };
    const onBlur = () => void sendSignal("WINDOW_BLUR");
    const onFullscreen = () => { if (!document.fullscreenElement) { setNotice("Please return to fullscreen. This exit was recorded as an integrity signal."); void sendSignal("FULLSCREEN_EXIT"); } };
    const onCopy = () => void sendSignal("COPY_ATTEMPT", "LOW");
    const onPaste = () => void sendSignal("PASTE_ATTEMPT", "LOW");
    const onContext = (event: MouseEvent) => { event.preventDefault(); void sendSignal("CONTEXT_MENU", "LOW"); };
    const onKeyDown = (event: KeyboardEvent) => {
      const devtoolsShortcut = event.key === "F12" || (event.ctrlKey && event.shiftKey && ["I", "J"].includes(event.key.toUpperCase()));
      if (devtoolsShortcut) void sendSignal("DEVTOOLS_SIGNAL", "HIGH");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
    };
    // The signal handler is bound only for the active attempt lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, result]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const timeLabel = useMemo(() => `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`, [secondsLeft]);

  if (result) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill assessment complete</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">{skillLabel}</h1>
        <div className="mt-8 grid gap-6 border-y border-stone-300 py-8 sm:grid-cols-4">
          <div><p className="text-sm text-stone-600">Skill score</p><p className="mt-1 text-3xl font-semibold">{result.mcqPercentage}%</p></div>
          <div><p className="text-sm text-stone-600">MCQ</p><p className="mt-1 text-3xl font-semibold">{result.mcqScore}/{result.mcqTotal}</p></div>
          <div><p className="text-sm text-stone-600">Integrity</p><p className="mt-1 text-3xl font-semibold">{result.integrityScore}/100</p></div>
          <div><p className="text-sm text-stone-600">Risk</p><p className="mt-1 text-lg font-semibold">{readable(result.riskLevel)}</p></div>
        </div>
        <p className="mt-6 text-lg font-semibold uppercase tracking-wide text-stone-900">{readable(result.verificationStatus)}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Evidence: AI-generated or verified fallback technical assessment, MCQ performance, and assessment integrity signals. Coding execution is intentionally unavailable until a secure sandbox is integrated.</p>
        {result.cancellationReason && <p className="mt-4 text-sm font-medium text-red-700">{result.cancellationReason}</p>}
        {result.signals.length > 0 && <p className="mt-4 text-sm text-stone-600">Signals detected: {result.signals.map((signal) => readable(signal.type)).join(" · ")}</p>}
        <Link href="/dashboard" className="mt-6 inline-flex h-10 w-fit items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Return to dashboard</Link>
      </main>
    );
  }

  if (consent !== "ready" || !attempt) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessment integrity notice</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Before you start {skillLabel}</h1>
        <p className="mt-4 text-base leading-7 text-stone-600">This assessment uses your camera and microphone to collect integrity signals during the assessment. It is monitoring for assessment integrity, not identity verification.</p>
        <ul className="mt-6 grid gap-3 border-y border-stone-200 py-6 text-sm text-stone-700">
          <li>Camera permission is required.</li><li>Microphone permission is required.</li><li>Tab visibility, focus, fullscreen, and selected browser interactions are recorded as signals.</li><li>Signals may affect the integrity score and manual-review recommendation.</li><li>Browser monitoring cannot prevent OS-level app switching.</li>
        </ul>
        {error && <p className="mt-5 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => void startAssessment()} disabled={consent === "checking"} className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 disabled:opacity-50">{consent === "checking" ? "Checking camera and microphone..." : "I agree & start assessment"}</button>
          <Link href="/assessments" className="inline-flex h-11 items-center border border-stone-400 px-5 text-sm text-stone-800">Cancel</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-6 py-8">
      <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">PRAMAAN assessment</p><h1 className="mt-2 text-2xl font-semibold text-stone-900">{skillLabel}</h1></div>
        <div className="grid grid-cols-3 gap-4 text-right text-xs text-stone-600"><span>Time<br /><strong className="text-base text-stone-900">{timeLabel}</strong></span><span>Camera<br /><strong className="text-stone-900">{cameraActive ? "Active" : "Unavailable"}</strong></span><span>Mic<br /><strong className="text-stone-900">{microphoneActive ? "Active" : "Unavailable"}</strong></span></div>
      </header>
      <div className="mt-4 flex items-center gap-3 border border-stone-300 bg-stone-100 p-3 text-xs text-stone-600">
        <video ref={videoRef} muted playsInline className="h-16 w-24 bg-stone-900 object-cover" aria-label="Assessment camera preview" />
        <span>Camera preview is visible while integrity monitoring is active. This prototype records stream availability and browser signals; it does not identify people or classify physical gadget use.</span>
      </div>
      {attempt.notice && <p className="mt-4 border border-stone-300 bg-stone-100 px-4 py-3 text-sm text-stone-700">{attempt.notice}</p>}
      {notice && <p className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Integrity notice: {notice}</p>}
      <div className="mt-6 flex gap-2 border-b border-stone-200 pb-3 text-sm"><button type="button" onClick={() => setRound("mcq")} className={round === "mcq" ? "border-b-2 border-stone-900 pb-2 font-medium" : "pb-2 text-stone-500"}>MCQ round · {answeredCount}/{attempt.questions.length}</button><button type="button" onClick={() => setRound("coding")} className={round === "coding" ? "border-b-2 border-stone-900 pb-2 font-medium" : "pb-2 text-stone-500"}>Coding round · JavaScript</button></div>
      {round === "mcq" && currentQuestion ? <section className="mt-8"><div className="flex justify-between gap-4"><p className="text-sm text-stone-600">Question {index + 1} of {attempt.questions.length}</p><p className="text-sm text-stone-600">{currentQuestion.topic ?? "Technical understanding"}</p></div><h2 className="mt-5 text-xl font-medium leading-8 text-stone-900">{currentQuestion.question}</h2><fieldset className="mt-7 grid gap-3"><legend className="sr-only">Answer choices</legend>{currentQuestion.options.map((option) => <label key={option.id} className="flex cursor-pointer gap-3 border border-stone-300 p-4 text-sm hover:bg-stone-100"><input type="radio" name={currentQuestion.id} checked={answers[currentQuestion.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: option.id }))} /><span><strong>{option.id}.</strong> {option.text}</span></label>)}</fieldset><div className="mt-6 flex justify-between gap-3"><button type="button" disabled={index === 0 || submitting} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="h-10 border border-stone-400 px-4 text-sm disabled:opacity-40">Previous</button><button type="button" disabled={index === attempt.questions.length - 1 || submitting} onClick={() => setIndex((value) => Math.min(attempt.questions.length - 1, value + 1))} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50 disabled:opacity-40">Next</button></div></section> : <section className="mt-8"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Coding challenge · JavaScript only</p><h2 className="mt-3 text-2xl font-semibold text-stone-900">{attempt.codingProblem.title}</h2><p className="mt-4 text-sm leading-6 text-stone-700">{attempt.codingProblem.statement}</p><p className="mt-4 text-sm text-stone-600">Input: {attempt.codingProblem.input}</p><p className="mt-2 text-sm text-stone-600">Output: {attempt.codingProblem.output}</p><textarea value={codingDraft} onChange={(event) => setCodingDraft(event.target.value)} className="mt-6 min-h-64 w-full border border-stone-300 bg-stone-950 p-4 font-mono text-sm text-stone-100" spellCheck={false} aria-label="JavaScript coding submission" /><p className="mt-3 text-sm text-stone-600">Prototype note: code is captured for review but is not executed on the server. No unsafe code execution is attempted.</p></section>}
      {error && <p className="mt-5 text-sm text-red-700">{error}</p>}
      <div className="mt-8 flex justify-end"><button type="button" onClick={() => void submitAssessment()} disabled={submitting || !allAnswered} className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 disabled:opacity-40">{submitting ? "Submitting assessment..." : secondsLeft === 0 ? "Submit expired attempt" : "Submit assessment"}</button></div>
    </main>
  );
}
