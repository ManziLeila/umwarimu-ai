import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const StudyPlanInput = z.object({
  studentName: z.string().min(1),
  weakSubjects: z.array(z.string().min(1)).min(1),
  lang: z.enum(["en", "rw"]),
});

/**
 * Turns a student's already-flagged weak subjects (from the dashboard/
 * at-risk data, not invented here) into a short, concrete study plan.
 * Same "never surface a raw error" rule as the tutor: a failed or
 * rate-limited Gemini call returns a friendly message, never a crash.
 */
export const generateStudyPlan = createServerFn({ method: "POST" })
  .validator((input: unknown) => StudyPlanInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) {
      return { ok: false as const, text: friendlyError(data.lang) };
    }

    try {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const { generateText } = await import("ai");
      const google = createGoogleGenerativeAI({ apiKey: key });

      const result = await generateText({
        model: google("gemini-3.6-flash"),
        prompt: buildPrompt(data),
      });

      const text = result.text.trim();
      return text
        ? { ok: true as const, text }
        : { ok: false as const, text: friendlyError(data.lang) };
    } catch (err) {
      console.error("Umwarimu AI study-plan call failed:", err);
      return { ok: false as const, text: friendlyError(data.lang) };
    }
  });

function buildPrompt(data: {
  studentName: string;
  weakSubjects: string[];
  lang: "en" | "rw";
}): string {
  const subjects = data.weakSubjects.join(", ");
  if (data.lang === "rw") {
    return [
      "Uri Umwarimu AI, wandikira umwarimu gahunda y'kwiga y'ibyumweru bibiri kuri umunyeshuri.",
      `Umunyeshuri: ${data.studentName}. Amasomo akeneye kwitabwaho: ${subjects}.`,
      "Tanga intambwe zoroshye, zisobanutse, ku minsi/ibyumweru, hamwe n'uburyo bwo kureba niba hari iterambere.",
      "Andika mu Kinyarwanda gusa, mu mirongo migufi, nta markdown (nta #, *, **).",
    ].join(" ");
  }
  return [
    "You are Umwarimu AI, writing a teacher-facing 2-week study plan for one student.",
    `Student: ${data.studentName}. Subjects needing attention: ${subjects}.`,
    "Give concrete, short steps per subject (what to practise, roughly how long, one checkpoint to confirm progress).",
    "Plain text only, short lines, no markdown (no #, *, **).",
  ].join(" ");
}

function friendlyError(lang: "en" | "rw"): string {
  return lang === "rw"
    ? "Ihangane, sinshoboye gukora gahunda ubu. Ongera ugerageze mu kanya gato."
    : "Sorry, I couldn't generate a study plan right now. Please try again in a moment.";
}
