import { randomUUID } from "node:crypto";
import { getCandidate } from "@/lib/demo-data";

type ChallengeQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
};

type ChallengeRecord = {
  id: string;
  candidateId: string;
  questions: ChallengeQuestion[];
  completedAt?: string;
  result?: {
    score: number;
    totalQuestions: number;
    percentage: number;
    recommendation: "Strong candidate" | "Needs review" | "Not recommended";
  };
};

const questions: ChallengeQuestion[] = [
  {
    id: "ai-ml-1",
    question: "Which technique is commonly used to reduce overfitting?",
    options: [
      "Increasing model complexity",
      "Regularization",
      "Removing validation data",
      "Increasing noise",
    ],
    correctAnswer: 1,
  },
  {
    id: "ai-ml-2",
    question: "What is a validation set used for?",
    options: [
      "Tuning model choices before final testing",
      "Replacing the training data",
      "Storing production logs",
      "Encrypting model weights",
    ],
    correctAnswer: 0,
  },
  {
    id: "ai-ml-3",
    question: "Which metric is commonly used for a balanced binary classifier?",
    options: ["F1 score", "Pixel density", "Latency only", "File size"],
    correctAnswer: 0,
  },
  {
    id: "ai-ml-4",
    question: "What does a feature represent in a machine-learning dataset?",
    options: ["An input signal used by the model", "A deployment server", "A password", "A UI component"],
    correctAnswer: 0,
  },
  {
    id: "ai-ml-5",
    question: "Why should evaluation data remain separate from training data?",
    options: ["To measure generalization on unseen examples", "To increase duplicate rows", "To remove labels", "To avoid saving models"],
    correctAnswer: 0,
  },
];

const challenges = new Map<string, ChallengeRecord>();

export function createChallenge(candidateId: string) {
  const candidate = getCandidate(candidateId);

  if (!candidate) {
    throw new Error("Candidate not found.");
  }

  const challenge: ChallengeRecord = {
    id: randomUUID(),
    candidateId,
    questions,
  };

  challenges.set(challenge.id, challenge);
  return challenge;
}

export function getChallenge(id: string) {
  return challenges.get(id) ?? null;
}

export function publicChallengeQuestions(challenge: ChallengeRecord) {
  return challenge.questions.map(({ id, question, options }) => ({
    id,
    question,
    options,
  }));
}

export function submitChallenge(id: string, answers: Record<string, number>) {
  const challenge = challenges.get(id);

  if (!challenge) {
    throw new Error("Challenge not found.");
  }

  if (challenge.completedAt) {
    throw new Error("This challenge has already been completed.");
  }

  for (const question of challenge.questions) {
    const answer = answers[question.id];

    if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) {
      throw new Error("Some challenge answers are invalid.");
    }
  }

  const score = challenge.questions.reduce(
    (total, question) => total + (answers[question.id] === question.correctAnswer ? 1 : 0),
    0
  );
  const percentage = Math.round((score / challenge.questions.length) * 100);
  const recommendation =
    percentage >= 80
      ? "Strong candidate"
      : percentage >= 60
        ? "Needs review"
        : "Not recommended";

  challenge.completedAt = new Date().toISOString();
  challenge.result = {
    score,
    totalQuestions: challenge.questions.length,
    percentage,
    recommendation,
  };

  return challenge;
}

export function safeChallengeResult(challenge: ChallengeRecord) {
  return {
    challengeId: challenge.id,
    candidateId: challenge.candidateId,
    ...(challenge.result ?? {
      score: 0,
      totalQuestions: challenge.questions.length,
      percentage: 0,
      recommendation: "Not recommended" as const,
    }),
    completedAt: challenge.completedAt ?? null,
  };
}
