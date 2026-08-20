import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users, Gauge, CalendarCheck, LifeBuoy } from "lucide-react";
import { useState } from "react";

import { GlassPanel, MetricCard, SectionLabel, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { statusStyles } from "@/lib/mock-data";
import { getSchoolDetail, setSchoolStatusAction } from "@/lib/network.functions";

export const Route = createFileRoute("/network/schools/$schoolId")({
  loader: ({ params }) => getSchoolDetail({ data: { schoolId: params.schoolId } }),
  head: () => ({ meta: [{ title: "School overview · Umwarimu AI" }] }),
  component: NetworkSchoolDetail,
});

function NetworkSchoolDetail() {
  const initial = Route.useLoaderData();
  const [school, setSchool] = useState(initial.school);
  const { dashboard, students, staff } = initial;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleStatus = async () => {
    const next = school.status === "active" ? "suspended" : "active";
    setError(null);
    setBusy(true);
    try {
      const result = await setSchoolStatusAction({
        data: { schoolId: school.schoolId, status: next },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSchool((s) => ({ ...s, status: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that school.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/network">
          <ArrowLeft /> Back to schools
        </Link>
      </Button>

      <GlassPanel className="animate-fade-up p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <SectionLabel>School overview</SectionLabel>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{school.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {school.district || "—"} · {school.adminEmail}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1.5 text-xs ${
                school.status === "active"
                  ? "border-success/30 bg-success/12 text-success"
                  : "border-risk/30 bg-risk/12 text-risk"
              }`}
            >
              {school.status === "active" ? "Active" : "Suspended"}
            </span>
            <Button
              variant={school.status === "active" ? "outline" : "hero"}
              size="sm"
              disabled={busy}
              onClick={toggleStatus}
            >
              {busy ? "…" : school.status === "active" ? "Suspend school" : "Reactivate school"}
            </Button>
          </div>
        </div>
        {error && <p className="text-risk mt-3 text-xs">{error}</p>}
      </GlassPanel>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Students"
          value={dashboard.metrics.students}
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Avg score"
          value={dashboard.metrics.avgScore}
          suffix="%"
          icon={<Gauge className="size-4" />}
        />
        <MetricCard
          label="Attendance"
          value={dashboard.metrics.attendance}
          suffix="%"
          icon={<CalendarCheck className="size-4" />}
        />
        <MetricCard
          label="Need support"
          value={dashboard.metrics.needSupport}
          icon={<LifeBuoy className="size-4" />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <SectionLabel>Students ({students.length})</SectionLabel>
          {students.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No students yet" body="This school hasn't added any students." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{s.className}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] ${statusStyles[s.status].bg} ${statusStyles[s.status].color}`}
                  >
                    {statusStyles[s.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel className="p-5">
          <SectionLabel>Staff ({staff.length})</SectionLabel>
          {staff.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No staff yet" body="This school hasn't added any staff." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {staff.map((s) => (
                <li
                  key={s.username}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {s.email} · @{s.username}
                      {s.classes.length > 0 ? ` · ${s.classes.join(", ")}` : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 rounded-full border border-border px-2.5 py-1 text-[0.65rem] capitalize">
                    {s.role.replace("-", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
