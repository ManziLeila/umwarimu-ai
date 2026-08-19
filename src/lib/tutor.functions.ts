import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";

const TutorInput = z.object({
  lang: z.enum(["en", "rw"]),
  subject: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export const askTutor = createServerFn({ method: "POST" })
  .validator((input: unknown) => TutorInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) {
      return { text: friendlyError(data.lang) };
    }

    const system = [
      "You are Umwarimu AI, a warm, patient bilingual tutor for Rwandan learners.",
      "Answer ANY question the user asks, on any topic — school subjects or not. Never refuse because a topic is outside a curriculum.",
      "For maths, physics or any calculation: solve it fully, show clear numbered steps, and state the final answer explicitly.",
      "Write in plain text only: no markdown, no #, *, ** or LaTeX. Use short lines, 'Step 1:' style numbering, and plain maths notation (x^2, sqrt(9), 3/4).",
      "Keep answers concise but complete, and end with a short check-for-understanding question.",

      data.subject ? `The learner is currently focused on: ${data.subject}.` : "",
      data.lang === "rw" ? "Reply in Kinyarwanda." : "Reply in English.",
    ]
      .filter(Boolean)
      .join(" ");

    // Never let a failed or rate-limited Gemini call surface as a raw error
    // to the student — always fall back to a plain, friendly message.
    try {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const google = createGoogleGenerativeAI({ apiKey: key });

      const result = streamText({
        model: google("gemini-3.6-flash"),
        system,
        messages: data.messages,
      });

      const text = await result.text;
      return { text: text || friendlyError(data.lang) };
    } catch (err) {
      console.error("Umwarimu AI tutor call failed:", err);
      return { text: friendlyError(data.lang) };
    }
  });

function friendlyError(lang: "en" | "rw"): string {
  return lang === "rw"
    ? "Ihangane, sinshoboye kubona igisubizo ubu. Ongera ugerageze mu kanya gato."
    : "Sorry, I couldn't reach the AI tutor right now. Please try again in a moment.";
}
