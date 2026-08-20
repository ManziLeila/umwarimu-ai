import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState, GlassPanel, SectionLabel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { getNetworkOverview, setSchoolStatusAction } from "@/lib/network.functions";

export const Route = createFileRoute("/network/")({
  loader: () => getNetworkOverview(),
  head: () => ({ meta: [{ title: "Schools · Umwarimu AI" }] }),
  component: NetworkOverview,
});

function NetworkOverview() {
  const initialSchools = Route.useLoaderData();
  const [schools, setSchools] = useState(initialSchools);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleStatus = async (schoolId: string, current: "active" | "suspended") => {
    const next = current === "active" ? "suspended" : "active";
    setError(null);
    setBusy(schoolId);
    try {
      const result = await setSchoolStatusAction({ data: { schoolId, status: next } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSchools((prev) => prev.map((s) => (s.schoolId === schoolId ? { ...s, status: next } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that school.");
    } finally {
      setBusy(null);
    }
  };

  const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
  const totalStaff = schools.reduce((sum, s) => sum + s.staffCount, 0);

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Network admin</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Every school on Umwarimu AI</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {schools.length} school{schools.length === 1 ? "" : "s"} · {totalStudents} students ·{" "}
          {totalStaff} staff
        </p>
      </header>

      {error && <p className="text-risk text-sm">{error}</p>}

      {schools.length === 0 ? (
        <EmptyState title="No schools yet" body="Schools appear here once they sign up." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {schools.map((school) => (
            <GlassPanel key={school.schoolId} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{school.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {school.district || "—"} · {school.adminEmail}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] ${
                    school.status === "active"
                      ? "border-success/30 bg-success/12 text-success"
                      : "border-risk/30 bg-risk/12 text-risk"
                  }`}
                >
                  {school.status === "active" ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <p className="font-display text-xl font-bold">{school.studentCount}</p>
                  <p className="text-muted-foreground text-xs">Students</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold">{school.staffCount}</p>
                  <p className="text-muted-foreground text-xs">Staff</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="glass" size="sm" asChild className="flex-1">
                  <Link to="/network/schools/$schoolId" params={{ schoolId: school.schoolId }}>
                    View
                  </Link>
                </Button>
                <Button
                  variant={school.status === "active" ? "outline" : "hero"}
                  size="sm"
                  className="flex-1"
                  disabled={busy === school.schoolId}
                  onClick={() => toggleStatus(school.schoolId, school.status)}
                >
                  {busy === school.schoolId
                    ? "…"
                    : school.status === "active"
                      ? "Suspend"
                      : "Reactivate"}
                </Button>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
