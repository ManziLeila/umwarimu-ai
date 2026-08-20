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

    const dataContext = await buildDataContext();

    const system = [
      "You are Umwarimu AI, a warm, patient bilingual tutor and guidance assistant for Rwandan learners and their teachers.",
      "Answer ANY question the user asks, on any topic — school subjects or not. Never refuse because a topic is outside a curriculum.",
      "For maths, physics or any calculation: solve it fully, show clear numbered steps, and state the final answer explicitly.",
      "Write in plain text only: no markdown, no #, *, ** or LaTeX. Use short lines, 'Step 1:' style numbering, and plain maths notation (x^2, sqrt(9), 3/4).",
      "Keep answers concise but complete, and end with a short check-for-understanding question.",

      dataContext
        ? `Real, current data about who you're talking to: ${dataContext} If they ask about their own students, class, or performance, answer using this data directly — don't say you don't have access to it. If a specific detail isn't in the data given, say so honestly rather than guessing.`
        : "",
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

/** Grounds the tutor's answers in the caller's own real data — a teacher's
 * class metrics and at-risk students, or a student's own subjects/scores —
 * so "how many students do I have" gets a real answer instead of a refusal.
 * Silent no-op on any failure: a data-context miss should never break the
 * chat, it should just fall back to a generic (still useful) tutor reply. */
async function buildDataContext(): Promise<string> {
  try {
    const { getCurrentSessionData } = await import("./auth.server");
    const session = await getCurrentSessionData();
    if (!session || !session.schoolId) return "";

    if (session.role === "student") {
      if (!session.studentId) return "";
      const { getStudent } = await import("./backend.server");
      const detail = await getStudent(session.schoolId, session.studentId, []);
      return [
        `You're talking with ${detail.name}, a student in ${detail.className} at ${session.schoolName}.`,
        `Their overall average is ${detail.overall}%, attendance ${detail.attendance}%.`,
        detail.subjects.length > 0
          ? `Subject scores: ${detail.subjects.map((s) => `${s.subject} ${s.score}%`).join(", ")}.`
          : "",
        `Weakest area: ${detail.weakest}.`,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (
      session.role === "teacher" ||
      session.role === "admin" ||
      session.role === "network-admin"
    ) {
      const { getDashboard, getStudents } = await import("./backend.server");
      const [dashboard, students] = await Promise.all([
        getDashboard(session.schoolId, session.classes),
        getStudents(session.schoolId, session.classes),
      ]);
      const flagged = students.filter((s) => s.status === "risk" || s.status === "support");
      return [
        `You're talking with ${session.name}, a ${session.role} at ${session.schoolName}` +
          (session.classes.length > 0
            ? ` (class teacher for: ${session.classes.join(", ")})`
            : "") +
          ".",
        `They currently have ${dashboard.metrics.students} student(s) in view, class average ${dashboard.metrics.avgScore}%, attendance ${dashboard.metrics.attendance}%.`,
        flagged.length > 0
          ? `Students needing support: ${flagged.map((s) => `${s.name} (${s.overall}%, weakest: ${s.weakest})`).join("; ")}.`
          : "No students currently flagged as needing support.",
      ].join(" ");
    }

    return "";
  } catch {
    return "";
  }
}

function friendlyError(lang: "en" | "rw"): string {
  return lang === "rw"
    ? "Ihangane, sinshoboye kubona igisubizo ubu. Ongera ugerageze mu kanya gato."
    : "Sorry, I couldn't reach the AI tutor right now. Please try again in a moment.";
}
