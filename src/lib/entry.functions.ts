import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ScoreEntryInput = z.object({
  studentId: z.string().min(1),
  subject: z.string().min(1),
  date: z.string().min(1),
  score: z.number(),
  maxScore: z.number(),
});

const SubmitScoresInput = z.object({ entries: z.array(ScoreEntryInput).min(1) });

export const submitScores = createServerFn({ method: "POST" })
  .validator((input: unknown) => SubmitScoresInput.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import("./auth.server");
    const { submitScores: submitScoresToBackend } = await import("./backend.server");

    const session = await requireSession();
    if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
    return await submitScoresToBackend(session.schoolId, data.entries, session.classes);
  });

const AttendanceEntryInput = z.object({
  studentId: z.string().min(1),
  date: z.string().min(1),
  attendanceStatus: z.enum(["present", "absent", "late"]),
});

const SubmitAttendanceInput = z.object({ entries: z.array(AttendanceEntryInput).min(1) });

export const submitAttendance = createServerFn({ method: "POST" })
  .validator((input: unknown) => SubmitAttendanceInput.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import("./auth.server");
    const { submitAttendance: submitAttendanceToBackend } = await import("./backend.server");

    const session = await requireSession();
    if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
    return await submitAttendanceToBackend(session.schoolId, data.entries, session.classes);
  });
