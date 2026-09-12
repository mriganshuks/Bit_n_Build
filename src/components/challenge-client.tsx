"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Question = { id: string; question: string; options: string[] };
type ChallengeResult = {
  challengeId: string;
  candidateId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  recommendation: string;
  completedAt: string | null;
};

type ChallengeClientProps = { candidateId: string };

export default function ChallengeClient({ candidateId }: ChallengeClientProps) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let current = true;
    async function start() {
      try {
        const response = await fetch("/api/challenge/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId }),
        });
        const data = (await response.json()) as {
          challengeId?: string;
          questions?: Question[];
          error?: string;
        };
        if (!response.ok || !data.challengeId || !data.questions) {
          throw new Error(data.error ?? "Unable to start challenge.");
        }
        if (current) {
          setChallengeId(data.challengeId);
          setQuestions(data.questions);
        }
      } catch (startError) {
        if (current) setError(startError instanceof Error ? startError.message : "Unable to start challenge.");
      } finally {
        if (current) setLoading(false);
      }
    }
    void start();
    return () => { current = false; };
  }, [candidateId]);

  async function submit() {
    if (!challengeId || submitting || result) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/challenge/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, answers }),
      });
      const data = (await response.json()) as ChallengeResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to submit challenge.");
      setResult(data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit challenge.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-stone-600">Starting skill challenge...</main>;
  }

  if (error && questions.length === 0) {
    return <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-sm text-red-700">{error}</p><Link href="/teammates" className="mt-5 inline-block text-sm underline underline-offset-4">Return to teammates</Link></main>;
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Challenge result</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Aman Sharma · AI / ML</h1>
        <div className="mt-10 border-y border-stone-300 py-8">
          <p className="text-sm text-stone-600">Score</p>
          <p className="mt-1 text-4xl font-semibold text-stone-900">{result.score} / {result.totalQuestions}</p>
          <p className="mt-5 text-sm text-stone-600">Assessment</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{result.percentage}%</p>
          <p className="mt-5 text-sm text-stone-600">Recommendation</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">{result.recommendation}</p>
        </div>
        <Link href="/team" className="mt-6 inline-flex h-10 w-fit items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50">Review team decision</Link>
      </main>
    );
  }

  const question = questions[index];
  const selected = answers[question.id];
  const last = index === questions.length - 1;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">AI / ML mini challenge</p>
      <div className="mt-3 flex justify-between gap-4"><h1 className="text-3xl font-semibold text-stone-900">Validate Aman’s claim</h1><p className="text-sm text-stone-600">Question {index + 1} of {questions.length}</p></div>
      <section className="mt-10 border-y border-stone-300 py-8">
        <h2 className="text-xl font-medium leading-8 text-stone-900">{question.question}</h2>
        <fieldset className="mt-8 grid gap-3"><legend className="sr-only">Challenge answer choices</legend>{question.options.map((option, optionIndex) => <label key={option} className="flex cursor-pointer gap-3 border border-stone-300 p-4 text-sm hover:bg-stone-100"><input type="radio" name={question.id} checked={selected === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} /><span>{option}</span></label>)}</fieldset>
      </section>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-between gap-3"><button type="button" disabled={index === 0 || submitting} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="h-10 border border-stone-400 px-4 text-sm disabled:opacity-40">Previous</button>{last ? <button type="button" disabled={submitting || Object.keys(answers).length !== questions.length} onClick={() => void submit()} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50 disabled:opacity-40">{submitting ? "Submitting..." : "Submit challenge"}</button> : <button type="button" disabled={submitting} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50 disabled:opacity-40">Next</button>}</div>
    </main>
  );
}
