import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { fallbackCodingProblem, fallbackQuestionSet, questionFingerprint } from "@/lib/assessment-fallback";
import type { AssessmentQuestion, Difficulty } from "@/lib/assessment-types";

const generatedQuestionSchema = z.object({
  prompt: z.string().trim().min(12).max(500),
  topic: z.string().trim().min(2).max(80),
  options: z.array(z.string().trim().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(4).max(500),
});
const generatedAssessmentSchema = z.object({ questions: z.array(generatedQuestionSchema).min(1).max(8) });

export type GeneratedAssessment = { questions: AssessmentQuestion[]; codingProblem: typeof fallbackCodingProblem; generatedBy: "gemini" | "fallback"; notice?: string };

function toQuestions(raw: z.infer<typeof generatedQuestionSchema>[]) {
  return raw.map((question) => {
    const ids = ["A", "B", "C", "D"] as const;
    const options = question.options.map((text, index) => ({ id: ids[index], text }));
    return { id: randomUUID(), prompt: question.prompt, topic: question.topic, options, correctOption: ids[question.correctIndex], explanation: question.explanation, fingerprint: questionFingerprint({ prompt: question.prompt, options }) };
  });
}

export async function generateAssessment(input: { skill: string; difficulty: Difficulty; count: number; previousFingerprints?: string[] }): Promise<GeneratedAssessment> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { questions: fallbackQuestionSet(input.skill, input.count, input.difficulty, input.previousFingerprints), codingProblem: fallbackCodingProblem, generatedBy: "fallback", notice: "Gemini is not configured; a vetted fallback question bank was used." };
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      contents: `Create ${input.count} distinct ${input.difficulty} multiple-choice assessment questions for ${input.skill}. Respond with JSON only: {"questions":[{"prompt":"...","topic":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}. All questions must be technically accurate. Do not reuse concepts from these previous fingerprints: ${(input.previousFingerprints ?? []).join(", ")}. Request nonce: ${randomUUID()}.`,
      config: { responseMimeType: "application/json", temperature: 0.85 },
    });
    const parsed = generatedAssessmentSchema.parse(JSON.parse(response.text ?? "{}"));
    const questions = toQuestions(parsed.questions).filter((question) => !(input.previousFingerprints ?? []).includes(question.fingerprint));
    if (questions.length < input.count) throw new Error("Gemini returned duplicate or insufficient questions.");
    return { questions: questions.slice(0, input.count), codingProblem: fallbackCodingProblem, generatedBy: "gemini" };
  } catch (error) {
    console.error("Gemini assessment generation failed", error);
    return { questions: fallbackQuestionSet(input.skill, input.count, input.difficulty, input.previousFingerprints), codingProblem: fallbackCodingProblem, generatedBy: "fallback", notice: "Question generation was unavailable; a vetted fallback question bank was used." };
  }
}
