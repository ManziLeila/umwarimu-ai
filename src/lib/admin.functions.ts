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

export const getStaffList = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAdminSession();
  const { listStaffForSchool } = await import("./backend.server");
  return await listStaffForSchool(session.schoolId);
});

export const getStudentAccountsList = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAdminSession();
  const { listStudentsForSchool } = await import("./backend.server");
  return await listStudentsForSchool(session.schoolId);
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
    const session = await requireAdminSession();
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
