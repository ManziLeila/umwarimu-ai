import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { GlassPanel, SectionLabel, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudent, getStudentAccountsList } from "@/lib/admin.functions";

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
  const initialStudents = Route.useLoaderData();
  const [students, setStudents] = useState(initialStudents);

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await createStudent({
        data: { studentId, name, className, guardianName, guardianEmail, studentEmail, username },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStudents((s) => [
        ...s,
        {
          studentId,
          name,
          className,
          guardianName,
          guardianEmail,
          status: "active" as const,
          hasAccount: true,
        },
      ]);
      setNotice(
        result.emailSent
          ? `Account created — credentials emailed to ${studentEmail}.`
          : `Account created. Email didn't send — temp password: ${result.tempPassword}`,
      );
      setStudentId("");
      setName("");
      setClassName("");
      setGuardianName("");
      setGuardianEmail("");
      setStudentEmail("");
      setUsername("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create that account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Admin</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Manage students</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add a student and (optionally) their own portal login.
        </p>
      </header>

      <GlassPanel className="animate-fade-up space-y-4 p-5">
        <SectionLabel>Add student</SectionLabel>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="student-id">Student ID</Label>
            <Input
              id="student-id"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-name">Full name</Label>
            <Input
              id="student-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-class">Class</Label>
            <Input
              id="student-class"
              placeholder="e.g. S3 Mathematics"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-username">Username</Label>
            <Input
              id="student-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian-name">Guardian name</Label>
            <Input
              id="guardian-name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian-email">Guardian email</Label>
            <Input
              id="guardian-email"
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="student-email">Student's own email</Label>
            <Input
              id="student-email"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          {error && <p className="text-risk text-xs sm:col-span-2">{error}</p>}
          {notice && <p className="text-success text-xs sm:col-span-2">{notice}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" variant="hero" disabled={submitting}>
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>
      </GlassPanel>

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
