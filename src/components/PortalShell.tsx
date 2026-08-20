import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, KeyRound, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/AiOrb";
import { LangToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/login.functions";
import type { SessionData } from "@/lib/auth.server";

const nav = [
  { to: "/portal/dashboard", label: "My Progress", icon: LayoutDashboard },
  { to: "/portal/tutor", label: "AI Tutor", icon: Sparkles },
  { to: "/change-password", label: "Change Password", icon: KeyRound },
] as const;

export function PortalShell({ children, session }: { children: ReactNode; session: SessionData }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-30 mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-none px-4 py-3 sm:mx-4 sm:mt-4 sm:rounded-2xl sm:px-5">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => {
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
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

      <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-2 py-2 sm:hidden">
        {nav.map((item) => {
          const active = path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-3 text-[0.65rem]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:pb-8">
        <p className="text-muted-foreground mb-4 text-xs">
          {session.name} · {session.schoolName}
        </p>
        {children}
      </main>
    </div>
  );
}
