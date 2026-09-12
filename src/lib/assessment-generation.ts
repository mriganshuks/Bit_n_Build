import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { fallbackQuestionSet, FALLBACK_CODING } from "@/lib/assessment-fallback";
import type { CodingProblem, Difficulty, MCQQuestion } from "@/lib/assessment-types";

const optionSchema = z.object({ id: z.enum(["A", "B", "C", "D"]), text: z.string().min(1) });
const generatedSchema = z.object({
  questions: z.array(z.object({
    id: z.string().min(1), question: z.string().min(1), skill: z.string().min(1),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    options: z.array(optionSchema).length(4), correctOption: z.enum(["A", "B", "C", "D"]),
    explanation: z.string().min(1), topic: z.string().min(1),
  })),
});

export type GeneratedAssessment = { questions: MCQQuestion[]; codingProblem: CodingProblem; generatedBy: "gemini" | "fallback"; notice?: string };

function uniqueQuestions(questions: MCQQuestion[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const hash = question.question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}

export async function generateAssessment(input: { skill: string; difficulty: Difficulty; count: number; previousQuestionHashes?: string[] }): Promise<GeneratedAssessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { questions: fallbackQuestionSet(input.count, input.difficulty), codingProblem: FALLBACK_CODING, generatedBy: "fallback", notice: "AI question generation is unavailable. PRAMAAN is using its verified assessment bank." };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${input.count} unique ${input.difficulty} MCQs for ${input.skill}. Return JSON only with a questions array. Every question needs exactly four options with ids A-D, one correctOption, explanation, topic, skill, difficulty. Avoid these prior question hashes: ${(input.previousQuestionHashes ?? []).join(", ")}`,
      config: { responseMimeType: "application/json" },
    });
    const parsed = generatedSchema.parse(JSON.parse(response.text ?? "{}"));
    const questions = uniqueQuestions(parsed.questions as MCQQuestion[]).slice(0, input.count);
    if (questions.length < input.count) throw new Error("Gemini returned too few unique questions.");
    return { questions, codingProblem: FALLBACK_CODING, generatedBy: "gemini" };
  } catch {
    return { questions: fallbackQuestionSet(input.count, input.difficulty), codingProblem: FALLBACK_CODING, generatedBy: "fallback", notice: "AI question generation failed validation or timed out. PRAMAAN switched to its verified assessment bank." };
  }
}
