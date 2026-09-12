"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PublicQuestion = {
  id: string;
  question: string;
  options: string[];
};

type AssessmentResult = {
  assessmentId: string;
  skill: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  status: "verified" | "partially_verified" | "not_verified";
  completedAt: string | null;
};

type AssessmentClientProps = {
  skill: string;
};

function readableSkill(skill: string) {
  return skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
}

function readableStatus(status: AssessmentResult["status"]) {
  return status.replaceAll("_", " ");
}

export default function AssessmentClient({ skill }: AssessmentClientProps) {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function startAssessment() {
      try {
        const response = await fetch("/api/assessment/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill }),
        });
        const data = (await response.json()) as {
          assessmentId?: string;
          questions?: PublicQuestion[];
          error?: string;
        };

        if (!response.ok || !data.assessmentId || !data.questions) {
          throw new Error(data.error ?? "Unable to start the assessment.");
        }

        if (isCurrent) {
          setAssessmentId(data.assessmentId);
          setQuestions(data.questions);
        }
      } catch (startError) {
        if (isCurrent) {
          setError(
            startError instanceof Error
              ? startError.message
              : "Unable to start the assessment."
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void startAssessment();

    return () => {
      isCurrent = false;
    };
  }, [skill]);

  async function submitAssessment() {
    if (!assessmentId || isSubmitting || result) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, answers }),
      });
      const data = (await response.json()) as AssessmentResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit the assessment.");
      }

      setResult(data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the assessment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <p className="text-sm text-stone-600">Starting assessment...</p>
      </main>
    );
  }

  if (error && questions.length === 0) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Assessment unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">
          {readableSkill(skill)}
        </h1>
        <p className="mt-4 text-sm text-red-700">{error}</p>
        <Link href="/assessments" className="mt-6 text-sm underline underline-offset-4">
          Return to assessments
        </Link>
      </main>
    );
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Assessment complete
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">
          {readableSkill(result.skill)}
        </h1>
        <div className="mt-10 border-y border-stone-300 py-8">
          <p className="text-sm text-stone-600">Score</p>
          <p className="mt-1 text-4xl font-semibold text-stone-900">
            {result.score} / {result.totalQuestions}
          </p>
          <p className="mt-5 text-sm text-stone-600">Percentage</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {result.percentage}%
          </p>
          <p className="mt-5 text-sm text-stone-600">Verification</p>
          <p className="mt-1 text-lg font-semibold capitalize text-stone-900">
            {readableStatus(result.status)}
          </p>
        </div>
        <p className="mt-6 text-sm leading-6 text-stone-600">
          Evidence: Technical assessment. This prototype uses transparent score
          thresholds and does not claim to prevent every form of cheating.
        </p>
        <Link
          href="/skills"
          className="mt-6 inline-flex h-10 w-fit items-center border border-stone-900 px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
        >
          Return to skills
        </Link>
      </main>
    );
  }

  const question = questions[currentIndex];
  const selectedAnswer = answers[question.id];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Technical assessment
      </p>
      <div className="mt-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <h1 className="text-3xl font-semibold text-stone-900">
          {readableSkill(skill)}
        </h1>
        <p className="text-sm text-stone-600">
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      <section className="mt-10 border-y border-stone-300 py-8">
        <h2 className="text-xl font-medium leading-8 text-stone-900">
          {question.question}
        </h2>
        <fieldset className="mt-8 grid gap-3">
          <legend className="sr-only">Answer choices</legend>
          {question.options.map((option, optionIndex) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-3 border border-stone-300 p-4 text-sm text-stone-800 hover:bg-stone-100"
            >
              <input
                type="radio"
                name={question.id}
                checked={selectedAnswer === optionIndex}
                onChange={() =>
                  setAnswers((currentAnswers) => ({
                    ...currentAnswers,
                    [question.id]: optionIndex,
                  }))
                }
                className="mt-0.5"
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      </section>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          disabled={currentIndex === 0 || isSubmitting}
          className="h-10 border border-stone-400 px-4 text-sm font-medium text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {isLastQuestion ? (
          <button
            type="button"
            onClick={() => void submitAssessment()}
            disabled={isSubmitting || Object.keys(answers).length !== questions.length}
            className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Submitting assessment..." : "Submit assessment"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
            disabled={isSubmitting}
            className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </main>
  );
}
