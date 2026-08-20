import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AmbientBackground } from "@/components/AmbientBackground";
import { NetworkShell } from "@/components/NetworkShell";
import { getCurrentSession } from "@/lib/login.functions";

export const Route = createFileRoute("/network")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    // This shell is network-admin only — everyone else belongs in /_app or /portal.
    if (session.role !== "network-admin") throw redirect({ to: "/dashboard" });
    return { session };
  },
  component: NetworkLayout,
});

function NetworkLayout() {
  const { session } = Route.useRouteContext();
  return (
    <>
      <AmbientBackground />
      <NetworkShell session={session}>
        <Outlet />
      </NetworkShell>
    </>
  );
}
