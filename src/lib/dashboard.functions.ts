import { createServerFn } from "@tanstack/react-start";

export const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSession } = await import("./auth.server");
  const { getDashboard } = await import("./backend.server");

  const session = await requireSession();
  if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
  return await getDashboard(session.schoolId, session.classes);
});
