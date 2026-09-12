import type { CodingProblem, Difficulty, MCQQuestion, PublicMCQQuestion } from "@/lib/assessment-types";

export const FALLBACK_MCQ: MCQQuestion[] = [
  {
    id: "fallback-js-1", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "Which keyword creates a block-scoped variable?",
    options: [{ id: "A", text: "var" }, { id: "B", text: "let" }, { id: "C", text: "function" }, { id: "D", text: "define" }],
    correctOption: "B", explanation: "let is block scoped.", topic: "scope",
  },
  {
    id: "fallback-js-2", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "What does Array.map() return?",
    options: [{ id: "A", text: "The original array only" }, { id: "B", text: "A new array from transformed values" }, { id: "C", text: "A boolean" }, { id: "D", text: "The first matching item" }],
    correctOption: "B", explanation: "map creates a new array.", topic: "arrays",
  },
  {
    id: "fallback-js-3", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "Which value represents an intentional absence of an object value?",
    options: [{ id: "A", text: "undefined" }, { id: "B", text: "NaN" }, { id: "C", text: "null" }, { id: "D", text: "false" }],
    correctOption: "C", explanation: "null represents an intentional empty value.", topic: "values",
  },
  {
    id: "fallback-js-4", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "What does a Promise represent?",
    options: [{ id: "A", text: "A CSS rule" }, { id: "B", text: "The eventual result of an asynchronous operation" }, { id: "C", text: "A synchronous loop" }, { id: "D", text: "A database table" }],
    correctOption: "B", explanation: "A Promise represents a future async result.", topic: "async",
  },
  {
    id: "fallback-js-5", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "Which method adds an item to the end of an array?",
    options: [{ id: "A", text: "shift" }, { id: "B", text: "slice" }, { id: "C", text: "push" }, { id: "D", text: "concat" }],
    correctOption: "C", explanation: "push appends an item.", topic: "arrays",
  },
  {
    id: "fallback-js-6", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "Which operator checks value and type equality?",
    options: [{ id: "A", text: "==" }, { id: "B", text: "=" }, { id: "C", text: "!==" }, { id: "D", text: "=>" }],
    correctOption: "C", explanation: "!== is strict inequality; its equality counterpart is ===.", topic: "operators",
  },
  {
    id: "fallback-js-7", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "What is a closure?",
    options: [{ id: "A", text: "A function with access to its lexical scope" }, { id: "B", text: "A closed network port" }, { id: "C", text: "A loop terminator" }, { id: "D", text: "A class constructor only" }],
    correctOption: "A", explanation: "Closures retain access to lexical variables.", topic: "closures",
  },
  {
    id: "fallback-js-8", type: "mcq", skill: "javascript", difficulty: "intermediate",
    question: "Which method converts JSON text into a JavaScript value?",
    options: [{ id: "A", text: "JSON.parse" }, { id: "B", text: "JSON.read" }, { id: "C", text: "JSON.decodeText" }, { id: "D", text: "JSON.value" }],
    correctOption: "A", explanation: "JSON.parse reads JSON text.", topic: "json",
  },
];

export const FALLBACK_CODING: CodingProblem = {
  id: "fallback-js-code-1",
  type: "coding",
  skill: "javascript",
  difficulty: "intermediate",
  title: "First repeated value",
  statement: "Given an array of integers, return the first value that appears twice. Return null when every value is unique.",
  input: "An array of integers.",
  output: "The first repeated integer or null.",
  constraints: ["Use JavaScript.", "Preserve the order in which repeats are discovered."],
  examples: [{ input: "[2, 1, 3, 2]", output: "2" }, { input: "[1, 2, 3]", output: "null" }],
  language: "javascript",
};

export function publicFallbackQuestions(count = 8): PublicMCQQuestion[] {
  return FALLBACK_MCQ.slice(0, count).map((question) => ({
    id: question.id,
    type: question.type,
    skill: question.skill,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
    topic: question.topic,
  }));
}

export function fallbackQuestionSet(count = 8, difficulty: Difficulty = "intermediate") {
  return FALLBACK_MCQ.slice(0, count).map((question) => ({ ...question, difficulty }));
}
