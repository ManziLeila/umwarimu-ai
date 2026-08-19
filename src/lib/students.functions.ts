import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getStudentsData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSession } = await import("./auth.server");
  const { getStudents } = await import("./backend.server");

  const session = await requireSession();
  if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
  return await getStudents(session.schoolId, session.classes);
});

const StudentDetailInput = z.object({ studentId: z.string().min(1) });

export const getStudentDetailData = createServerFn({ method: "GET" })
  .validator((input: unknown) => StudentDetailInput.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import("./auth.server");
    const { getStudent } = await import("./backend.server");

    const session = await requireSession();
    if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
    return await getStudent(session.schoolId, data.studentId, session.classes);
  });
