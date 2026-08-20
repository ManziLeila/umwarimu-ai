import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// --- Student side: a thread with their own class teacher(s) ---

export const getMyMessages = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSession } = await import("./auth.server");
  const { listMessagesForStudent } = await import("./backend.server");

  const session = await requireSession();
  if (session.role !== "student" || !session.studentId) {
    throw new Error("Only students can do this.");
  }
  return await listMessagesForStudent(session.schoolId, session.studentId);
});

const SendMyMessageInput = z.object({ text: z.string().min(1).max(2000) });

export const sendMyMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => SendMyMessageInput.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import("./auth.server");
    const { sendMessage } = await import("./backend.server");

    const session = await requireSession();
    if (session.role !== "student" || !session.studentId) {
      throw new Error("Only students can do this.");
    }
    return await sendMessage(session.schoolId, {
      studentId: session.studentId,
      className: session.classes[0] ?? "",
      senderRole: "student",
      senderName: session.name,
      senderUsername: session.username,
      text: data.text,
    });
  });

// --- Teacher/admin side: an inbox of threads, one per student they can see ---

async function requireStaffSession() {
  const { requireSession } = await import("./auth.server");
  const session = await requireSession();
  if (session.role !== "teacher" && session.role !== "admin" && session.role !== "network-admin") {
    throw new Error("Only staff can do this.");
  }
  if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
  return session;
}

export const getTeacherMessageThreads = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireStaffSession();
  const { listMessageThreads } = await import("./backend.server");
  return await listMessageThreads(session.schoolId, session.classes);
});

const SendTeacherMessageInput = z.object({
  studentId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export const sendTeacherMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => SendTeacherMessageInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireStaffSession();
    const { getStudent, sendMessage } = await import("./backend.server");

    // getStudent already applies the same class-scoping used everywhere
    // else — if this student isn't one of the teacher's own, it simply
    // won't be found, which is exactly the rejection we want.
    let student;
    try {
      student = await getStudent(session.schoolId, data.studentId, session.classes);
    } catch {
      student = null;
    }
    if (!student) throw new Error("You don't have access to that student.");

    return await sendMessage(session.schoolId, {
      studentId: data.studentId,
      className: student.className,
      senderRole: "teacher",
      senderName: session.name,
      senderUsername: session.username,
      text: data.text,
    });
  });
