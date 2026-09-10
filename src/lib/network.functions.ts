import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function requireNetworkAdminSession() {
  const { requireSession } = await import("./auth.server");
  const session = await requireSession();
  if (session.role !== "network-admin") {
    throw new Error("Only a network admin can do this.");
  }
  return session;
}

export const getNetworkOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireNetworkAdminSession();
  const { listSchoolsWithStats } = await import("./backend.server");
  return await listSchoolsWithStats();
});

const SetSchoolStatusInput = z.object({
  schoolId: z.string().min(1),
  status: z.enum(["active", "suspended"]),
});

export const setSchoolStatusAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => SetSchoolStatusInput.parse(input))
  .handler(async ({ data }) => {
    await requireNetworkAdminSession();
    const { setSchoolStatus } = await import("./backend.server");
    try {
      await setSchoolStatus(data.schoolId, data.status);
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Couldn't update that school.",
      };
    }
  });

/** Permanent (well — Drive-trash-recoverable) removal of a school and its
 * staff/student accounts. Deliberately separate from setSchoolStatusAction
 * (suspend/reactivate is reversible in-place; this is not meant for routine
 * use — it exists for cleaning up test/duplicate schools). */
export const deleteSchoolAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ schoolId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    await requireNetworkAdminSession();
    const { deleteSchool } = await import("./backend.server");
    try {
      const result = await deleteSchool(data.schoolId);
      return { ok: true as const, result };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Couldn't delete that school.",
      };
    }
  });

const SchoolIdInput = z.object({ schoolId: z.string().min(1) });

/** A network admin drilling into one school's own dashboard/roster/staff —
 * unlike every other read in this app, this is deliberately NOT scoped to
 * the caller's own session.schoolId (they have none), but to whichever
 * school they picked from the overview list. */
export const getSchoolDetail = createServerFn({ method: "GET" })
  .validator((input: unknown) => SchoolIdInput.parse(input))
  .handler(async ({ data }) => {
    await requireNetworkAdminSession();
    const { getDashboard, getStudents, listStaffForSchool, listSchoolsWithStats } =
      await import("./backend.server");

    const schools = await listSchoolsWithStats();
    const school = schools.find((s) => s.schoolId === data.schoolId);
    if (!school) throw new Error(`Unknown school "${data.schoolId}".`);

    const [dashboard, students, staff] = await Promise.all([
      getDashboard(data.schoolId, []),
      getStudents(data.schoolId, []),
      listStaffForSchool(data.schoolId),
    ]);

    return { school, dashboard, students, staff };
  });
