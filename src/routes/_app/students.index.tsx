import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

import { AddStudentsPanel } from "@/components/AddStudentsPanel";
import { GlassPanel, SectionLabel, TrendBadge, EmptyState } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusStyles, type StudentStatus } from "@/lib/mock-data";
import { getStudentsData } from "@/lib/students.functions";

export const Route = createFileRoute("/_app/students/")({
  loader: () => getStudentsData(),
  head: () => ({
    meta: [
      { title: "Students · Umwarimu AI" },
      {
        name: "description",
        content:
          "Browse every learner with performance, attendance and support status at a glance.",
      },
      { property: "og:title", content: "Students · Umwarimu AI" },
      {
        property: "og:description",
        content: "Learner performance, attendance and support status.",
      },
    ],
  }),
  component: StudentsPage,
});

const filters: { key: StudentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on-track", label: "On Track" },
  { key: "improving", label: "Improving" },
  { key: "support", label: "Need Support" },
  { key: "risk", label: "At Risk" },
];

function StudentsPage() {
  const students = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentStatus | "all">("all");

  const list = students.filter(
    (s) =>
      (filter === "all" || s.status === filter) &&
      s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>REB curriculum</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Students</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {students.length} learners in this class
        </p>
      </header>

      <AddStudentsPanel classOptions={session.classes} onAdded={() => router.invalidate()} />

      <GlassPanel className="animate-fade-up space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="relative min-w-0">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search students by name"
              className="h-10 rounded-xl bg-secondary/40 pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  filter === f.key
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="No students match this view"
            body="Try clearing the filter or searching a different name."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  to="/students/$studentId"
                  params={{ studentId: s.id }}
                  className="glass card-hover block rounded-2xl p-4"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{s.className}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem]",
                        statusStyles[s.status].bg,
                        statusStyles[s.status].color,
                      )}
                    >
                      {statusStyles[s.status].label}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl font-bold">{s.overall}%</p>
                      <p className="text-muted-foreground text-xs">Overall</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{s.attendance}%</p>
                      <p className="text-muted-foreground text-xs">Attendance</p>
                    </div>
                    <TrendBadge
                      trend={s.trend}
                      value={
                        s.trend === "up" ? "Improving" : s.trend === "down" ? "Declining" : "Steady"
                      }
                    />
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                    <div
                      className="h-full rounded-full bg-[image:var(--gradient-accent)]"
                      style={{ width: `${s.overall}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <div className="flex justify-center">
        <Button variant="glass" size="sm">
          Export class report
        </Button>
      </div>
    </div>
  );
}
