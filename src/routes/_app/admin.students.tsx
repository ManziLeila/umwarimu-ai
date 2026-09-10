import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AddStudentsPanel } from "@/components/AddStudentsPanel";
import { GlassPanel, SectionLabel, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { getStudentAccountsList, resetStudentPassword } from "@/lib/admin.functions";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resettingUsername, setResettingUsername] = useState<string | null>(null);

  const handleReset = async (username: string) => {
    setError(null);
    setNotice(null);
    setResettingUsername(username);
    try {
      const result = await resetStudentPassword({ data: { username } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(`New temp password for @${username}: ${result.tempPassword}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset that password.");
    } finally {
      setResettingUsername(null);
    }
  };

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
        {error && <p className="text-risk mt-3 text-xs">{error}</p>}
        {notice && <p className="text-success mt-3 text-xs">{notice}</p>}
        {students.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No students yet" body="Add your first student above." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {students.map((s) => {
              const username = s.username;
              return (
                <li
                  key={s.studentId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3"
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
                  {username ? (
                    <Button
                      variant="glass"
                      size="sm"
                      disabled={resettingUsername === username}
                      onClick={() => handleReset(username)}
                    >
                      {resettingUsername === username ? "Resetting…" : "Reset password"}
                    </Button>
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
