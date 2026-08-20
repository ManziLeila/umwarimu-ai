import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  Search,
  Menu,
  LogOut,
  UserCog,
  GraduationCap,
  ClipboardList,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/AiOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { notifications } from "@/lib/mock-data";
import { signOut } from "@/lib/login.functions";
import type { SessionData } from "@/lib/auth.server";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

const nav = [
  { to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/students", key: "nav.students", icon: Users },
  { to: "/analytics", key: "nav.analytics", icon: BarChart3 },
  { to: "/tutor", key: "nav.tutor", icon: Sparkles },
  { to: "/entry", key: "nav.entry", icon: ClipboardList },
  { to: "/notifications", key: "nav.notifications", icon: Bell },
  { to: "/settings", key: "nav.settings", icon: Settings },
] as const;

const adminNav = [
  { to: "/admin/staff", key: "nav.adminStaff", icon: UserCog },
  { to: "/admin/students", key: "nav.adminStudents", icon: GraduationCap },
] as const;

export function LangToggle() {
  const { lang, setLang } = useApp();
  return (
    <div
      className="glass flex shrink-0 items-center rounded-full p-0.5 text-xs"
      role="group"
      aria-label="Language"
    >
      {(["en", "rw"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold uppercase transition-colors",
            lang === l
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function NavItems({
  items,
  onNavigate,
}: {
  items: ReadonlyArray<{ to: string; key: string; icon: typeof LayoutDashboard }>;
  onNavigate?: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useApp();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = path.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              active
                ? "border border-primary/30 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
            <span className="truncate">{t(item.key)}</span>
            {item.to === "/notifications" && (
              <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[0.65rem] font-semibold text-primary">
                {notifications.filter((n) => n.unread).length}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, session }: { children: ReactNode; session: SessionData }) {
  const [open, setOpen] = useState(false);
  const { t } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState<string>("");
  const isAdmin = session.role === "admin" || session.role === "network-admin";
  const navItems = isAdmin ? [...nav, ...adminNav] : nav;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen lg:flex lg:gap-6 lg:p-4">
      {/* Desktop sidebar */}
      <aside className="glass-strong sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col justify-between rounded-3xl p-4 lg:flex">
        <div>
          <Link to="/" className="mb-6 flex items-center px-1 py-2">
            <Logo />
          </Link>
          <NavItems items={navItems} />
        </div>
        <div className="glass rounded-2xl p-3">
          <p className="text-muted-foreground text-[0.7rem] tracking-wide uppercase">
            {session.schoolName || "Umwarimu AI"}
          </p>
          <p className="mt-1 text-sm font-medium capitalize">{session.role.replace("-", " ")}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="glass-strong sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none px-4 py-3 lg:top-4 lg:rounded-2xl lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <span className="lg:hidden">
              <Logo compact />
            </span>
            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                aria-label={t("common.search")}
                placeholder={t("common.search")}
                className="h-10 rounded-xl border-border bg-secondary/40 pl-9"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground hidden text-xs xl:block">{now}</span>
            <LangToggle />
            <Link
              to="/notifications"
              aria-label={t("nav.notifications")}
              className="relative grid size-10 place-items-center rounded-xl border border-border transition-colors hover:border-primary/40"
            >
              <Bell className="size-4" aria-hidden />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary glow-dot text-primary" />
            </Link>
            <span
              className="font-display grid size-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-xs font-bold text-primary"
              title={session.name}
            >
              {initials(session.name)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              title="Sign out"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </header>

        <main className="px-4 pt-6 pb-28 lg:px-2 lg:pb-8">{children}</main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="glass-strong animate-fade-in absolute inset-y-0 left-0 w-72 p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <NavItems items={navItems} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-2 py-2 lg:hidden">
        {nav.slice(0, 4).map((item) => (
          // Bottom bar stays fixed to the core 4 for everyone — admin pages
          // are reachable via the sidebar/drawer, not the mobile quick-nav.
          <MobileNavLink key={item.to} to={item.to} label={t(item.key)} Icon={item.icon} />
        ))}
      </nav>
    </div>
  );
}

function MobileNavLink({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: typeof LayoutDashboard;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-3 text-[0.65rem]",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
