import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { fallbackCodingProblem, fallbackQuestionSet, questionFingerprint } from "@/lib/assessment-fallback";
import type { AssessmentQuestion, CodingProblem, Difficulty } from "@/lib/assessment-types";

const generatedQuestionSchema = z.object({
  prompt: z.string().trim().min(12).max(500),
  topic: z.string().trim().min(2).max(80),
  options: z.array(z.string().trim().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(4).max(500),
});

const generatedCodingProblemSchema = z.object({
  title: z.string().trim().min(3).max(120),
  statement: z.string().trim().min(15).max(1500),
  constraints: z.array(z.string().trim().min(2).max(200)).min(1).max(6),
  examples: z.array(z.object({ input: z.string().trim(), output: z.string().trim() })).min(1).max(4),
  starterCode: z.string().min(10).max(2000),
  hiddenTests: z.array(z.object({ input: z.unknown(), expected: z.unknown() })).min(1).max(8),
});

const generatedAssessmentSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(8),
  codingProblem: generatedCodingProblemSchema.optional(),
});

export type GeneratedAssessment = {
  questions: AssessmentQuestion[];
  codingProblem: CodingProblem;
  generatedBy: "gemini" | "fallback";
  notice?: string;
};

function toQuestions(raw: z.infer<typeof generatedQuestionSchema>[]) {
  return raw.map((question) => {
    const ids = ["A", "B", "C", "D"] as const;
    const options = question.options.map((text, index) => ({ id: ids[index], text }));
    return {
      id: randomUUID(),
      prompt: question.prompt,
      topic: question.topic,
      options,
      correctOption: ids[question.correctIndex],
      explanation: question.explanation,
      fingerprint: questionFingerprint({ prompt: question.prompt, options }),
    };
  });
}

export async function generateAssessment(input: {
  skill: string;
  difficulty: Difficulty;
  count: number;
  previousFingerprints?: string[]
}): Promise<GeneratedAssessment> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      questions: fallbackQuestionSet(input.skill, input.count, input.difficulty, input.previousFingerprints),
      codingProblem: fallbackCodingProblem,
      generatedBy: "fallback",
      notice: "Gemini is not configured; a vetted fallback question bank was used.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a strict technical assessment generator for the skill "${input.skill}" at "${input.difficulty}" level.
Generate ${input.count} distinct, technically rigorous multiple-choice questions AND one relevant practical coding challenge in JavaScript.

Respond with strict JSON ONLY, matching this structure:
{
  "questions": [
    {
      "prompt": "Technical question statement",
      "topic": "Specific subtopic",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Detailed explanation of why the correct option is right"
    }
  ],
  "codingProblem": {
    "title": "Problem Title",
    "statement": "Clear problem description appropriate for ${input.skill} (${input.difficulty})",
    "constraints": ["Constraint 1", "Constraint 2"],
    "examples": [{"input": "example input", "output": "example output"}],
    "starterCode": "function solve(input) {\\n  // Implementation\\n}\\n\\nmodule.exports = { solve };\\n",
    "hiddenTests": [{"input": "test input", "expected": "expected output"}]
  }
}

Rules:
- Do not repeat questions or topics from previous fingerprints: ${(input.previousFingerprints ?? []).slice(0, 10).join(", ")}.
- The coding problem must be in JavaScript, with a valid starterCode and at least 2 hidden test cases.
- Request nonce: ${randomUUID()}.`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.75 },
    });

    const parsed = generatedAssessmentSchema.parse(JSON.parse(response.text ?? "{}"));
    const questions = toQuestions(parsed.questions).filter(
      (question) => !(input.previousFingerprints ?? []).includes(question.fingerprint)
    );

    if (questions.length < input.count) {
      throw new Error("Gemini returned duplicate or insufficient questions.");
    }

    let codingProblem: CodingProblem = fallbackCodingProblem;
    if (parsed.codingProblem) {
      codingProblem = {
        id: randomUUID(),
        title: parsed.codingProblem.title,
        statement: parsed.codingProblem.statement,
        constraints: parsed.codingProblem.constraints,
        examples: parsed.codingProblem.examples,
        starterCode: parsed.codingProblem.starterCode,
        language: "javascript",
        hiddenTests: parsed.codingProblem.hiddenTests,
      };
    }

    return {
      questions: questions.slice(0, input.count),
      codingProblem,
      generatedBy: "gemini",
    };
  } catch (error) {
    console.error("Gemini assessment generation failed, using fallback:", error instanceof Error ? error.message : error);
    return {
      questions: fallbackQuestionSet(input.skill, input.count, input.difficulty, input.previousFingerprints),
      codingProblem: fallbackCodingProblem,
      generatedBy: "fallback",
      notice: "Question generation was unavailable; a vetted fallback question bank was used.",
    };
  }
}
