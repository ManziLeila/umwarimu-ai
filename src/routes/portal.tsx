import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AmbientBackground } from "@/components/AmbientBackground";
import { PortalShell } from "@/components/PortalShell";
import { getCurrentSession } from "@/lib/login.functions";

export const Route = createFileRoute("/portal")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    // This shell is student-only — a staff session belongs in /_app instead.
    if (session.role !== "student") throw redirect({ to: "/dashboard" });
    return { session };
  },
  component: PortalLayout,
});

function PortalLayout() {
  const { session } = Route.useRouteContext();
  return (
    <>
      <AmbientBackground />
      <PortalShell session={session}>
        <Outlet />
      </PortalShell>
    </>
  );
}
