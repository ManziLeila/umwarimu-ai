import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/AiOrb";
import { LangToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/login.functions";
import type { SessionData } from "@/lib/auth.server";

export function NetworkShell({ children, session }: { children: ReactNode; session: SessionData }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-30 mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-none px-4 py-3 sm:mx-4 sm:mt-4 sm:rounded-2xl sm:px-5">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <Link
          to="/network"
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
            path.startsWith("/network") ? "bg-primary/10 text-primary" : "text-muted-foreground",
          )}
        >
          <Building2 className="size-4" aria-hidden />
          Schools
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            title="Sign out"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-10">
        <p className="text-muted-foreground mb-4 text-xs">{session.name} · Network admin</p>
        {children}
      </main>
    </div>
  );
}
