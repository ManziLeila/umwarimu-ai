import { createServerFn } from "@tanstack/react-start";

export const getAnalyticsData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSession } = await import("./auth.server");
  const { getAnalytics } = await import("./backend.server");

  const session = await requireSession();
  if (!session.schoolId) throw new Error("Your account isn't linked to a school yet.");
  return await getAnalytics(session.schoolId, session.classes);
});
