import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SessionData } from "./auth.server";

async function requireAdminSession(): Promise<SessionData> {
  const { requireSession } = await import("./auth.server");
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "network-admin") {
    throw new Error("Only a school admin can do this.");
  }
  if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
  return session;
}

/** Admin/network-admin can manage any class; a teacher can only manage
 * their own class(es) — enforced per-row wherever `className` is involved. */
async function requireStudentManagerSession(): Promise<SessionData> {
  const { requireSession } = await import("./auth.server");
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "network-admin" && session.role !== "teacher") {
    throw new Error("Only staff can do this.");
  }
  if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
  return session;
}

function assertClassAllowed(session: SessionData, className: string): void {
  if (session.role === "teacher" && !session.classes.includes(className)) {
    throw new Error(
      `You can only add students to your own class(es): ${session.classes.join(", ")}.`,
    );
  }
}

export const getStaffList = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAdminSession();
  const { listStaffForSchool } = await import("./backend.server");
  return await listStaffForSchool(session.schoolId);
});

export const getStudentAccountsList = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireStudentManagerSession();
  const { listStudentsForSchool } = await import("./backend.server");
  const students = await listStudentsForSchool(session.schoolId);
  if (session.role === "teacher") {
    return students.filter((s) => session.classes.includes(s.className));
  }
  return students;
});

const CreateTeacherInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  username: z.string().min(3),
  role: z.enum(["teacher", "admin"]),
  classes: z.array(z.string().min(1)).default([]),
});

export const createTeacher = createServerFn({ method: "POST" })
  .validator((input: unknown) => CreateTeacherInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireAdminSession();
    const { hashPassword, generateTempPassword } = await import("./auth.server");
    const { createTeacherAccount } = await import("./backend.server");

    const tempPassword = generateTempPassword();
    const { hash, salt } = hashPassword(tempPassword);

    try {
      const result = await createTeacherAccount({
        schoolId: session.schoolId,
        email: data.email,
        name: data.name,
        username: data.username,
        passwordHash: hash,
        passwordSalt: salt,
        tempPassword,
        classes: data.classes,
        role: data.role,
      });
      return {
        ok: true as const,
        username: data.username,
        emailSent: result.emailSent,
        tempPassword: result.emailSent ? undefined : tempPassword,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Couldn't create that account.",
      };
    }
  });

const CreateStudentInput = z.object({
  studentId: z.string().min(1),
  name: z.string().min(1),
  className: z.string().min(1),
  guardianName: z.string().min(1),
  guardianEmail: z.string().email(),
  studentEmail: z.string().email(),
  username: z.string().min(3),
});

export const createStudent = createServerFn({ method: "POST" })
  .validator((input: unknown) => CreateStudentInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireStudentManagerSession();
    assertClassAllowed(session, data.className);
    const { hashPassword, generateTempPassword } = await import("./auth.server");
    const { createStudentAccount } = await import("./backend.server");

    const tempPassword = generateTempPassword();
    const { hash, salt } = hashPassword(tempPassword);

    try {
      const result = await createStudentAccount({
        schoolId: session.schoolId,
        studentId: data.studentId,
        name: data.name,
        className: data.className,
        guardianName: data.guardianName,
        guardianEmail: data.guardianEmail,
        studentEmail: data.studentEmail,
        username: data.username,
        passwordHash: hash,
        passwordSalt: salt,
        tempPassword,
      });
      return {
        ok: true as const,
        username: data.username,
        emailSent: result.emailSent,
        tempPassword: result.emailSent ? undefined : tempPassword,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Couldn't create that account.",
      };
    }
  });

const BulkCreateStudentsInput = z.object({ students: z.array(CreateStudentInput).min(1).max(200) });

export const bulkCreateStudents = createServerFn({ method: "POST" })
  .validator((input: unknown) => BulkCreateStudentsInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireStudentManagerSession();
    const { hashPassword, generateTempPassword } = await import("./auth.server");
    const { createStudentAccount } = await import("./backend.server");

    const created: Array<{ studentId: string; username: string; emailSent: boolean }> = [];
    const failed: Array<{ studentId: string; reason: string }> = [];

    for (const row of data.students) {
      try {
        assertClassAllowed(session, row.className);
        const tempPassword = generateTempPassword();
        const { hash, salt } = hashPassword(tempPassword);
        const result = await createStudentAccount({
          schoolId: session.schoolId,
          studentId: row.studentId,
          name: row.name,
          className: row.className,
          guardianName: row.guardianName,
          guardianEmail: row.guardianEmail,
          studentEmail: row.studentEmail,
          username: row.username,
          passwordHash: hash,
          passwordSalt: salt,
          tempPassword,
        });
        created.push({
          studentId: row.studentId,
          username: row.username,
          emailSent: result.emailSent,
        });
      } catch (err) {
        failed.push({
          studentId: row.studentId || "(blank)",
          reason: err instanceof Error ? err.message : "Couldn't create that account.",
        });
      }
    }

    return { created, failed };
  });
