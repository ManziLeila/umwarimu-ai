import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { AddStudentsPanel } from "@/components/AddStudentsPanel";
import { GlassPanel, SectionLabel, EmptyState } from "@/components/kit";
import { getStudentAccountsList } from "@/lib/admin.functions";

export const Route = createFileRoute("/_app/admin/students")({
  beforeLoad: ({ context }) => {
    if (context.session.role !== "admin" && context.session.role !== "network-admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getStudentAccountsList(),
  head: () => ({ meta: [{ title: "Manage Students · Umwarimu AI" }] }),
  component: AdminStudentsPage,
});

function AdminStudentsPage() {
  const students = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Admin</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Manage students</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add a student and (optionally) their own portal login — one at a time, or in bulk.
        </p>
      </header>

      <AddStudentsPanel classOptions={[]} onAdded={() => router.invalidate()} />

      <GlassPanel className="p-5">
        <SectionLabel>Current students ({students.length})</SectionLabel>
        {students.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No students yet" body="Add your first student above." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {students.map((s) => (
              <li
                key={s.studentId}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {s.className} · Guardian: {s.guardianEmail}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] ${
                    s.hasAccount
                      ? "border-success/30 bg-success/12 text-success"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s.hasAccount ? "Has login" : "No login"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
