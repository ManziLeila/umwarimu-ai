import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AmbientBackground } from "@/components/AmbientBackground";
import { AppShell } from "@/components/AppShell";
import { getCurrentSession } from "@/lib/login.functions";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    // Student portal isn't built yet (planned separately) — this shell is
    // teacher/admin only, so a student session doesn't belong here.
    if (session.role === "student") throw redirect({ to: "/" });
    return { session };
  },
  component: AppLayout,
});

function AppLayout() {
  const { session } = Route.useRouteContext();
  return (
    <>
      <AmbientBackground />
      <AppShell session={session}>
        <Outlet />
      </AppShell>
    </>
  );
}
