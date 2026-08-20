import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AmbientBackground } from "@/components/AmbientBackground";
import { AppShell } from "@/components/AppShell";
import { getCurrentSession } from "@/lib/login.functions";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    // This shell is school teacher/admin only — a student belongs in
    // /portal, a network admin (not scoped to any one school) in /network.
    if (session.role === "student") throw redirect({ to: "/portal/dashboard" });
    if (session.role === "network-admin") throw redirect({ to: "/network" });
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
