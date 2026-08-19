import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { GlassPanel, SectionLabel, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeacher, getStaffList } from "@/lib/admin.functions";

export const Route = createFileRoute("/_app/admin/staff")({
  beforeLoad: ({ context }) => {
    if (context.session.role !== "admin" && context.session.role !== "network-admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getStaffList(),
  head: () => ({ meta: [{ title: "Manage Staff · Umwarimu AI" }] }),
  component: AdminStaffPage,
});

function AdminStaffPage() {
  const initialStaff = Route.useLoaderData();
  const [staff, setStaff] = useState(initialStaff);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [classes, setClasses] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await createTeacher({
        data: {
          email,
          name,
          username,
          role,
          classes: classes
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStaff((s) => [
        ...s,
        {
          email,
          name,
          username,
          role,
          classes: classes
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          mustChangePassword: true,
        },
      ]);
      setNotice(
        result.emailSent
          ? `Account created — credentials emailed to ${email}.`
          : `Account created. Email didn't send — temp password: ${result.tempPassword}`,
      );
      setEmail("");
      setName("");
      setUsername("");
      setClasses("");
      setRole("teacher");
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
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Manage staff</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create teacher/admin logins. A teacher only sees the class(es) assigned to them.
        </p>
      </header>

      <GlassPanel className="animate-fade-up space-y-4 p-5">
        <SectionLabel>Add staff member</SectionLabel>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="staff-name">Full name</Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-username">Username</Label>
            <Input
              id="staff-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "teacher" | "admin")}
              className="border-border bg-secondary/40 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {role === "teacher" && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff-classes">Classes (comma-separated)</Label>
              <Input
                id="staff-classes"
                placeholder="e.g. S3 Mathematics, S3 English"
                value={classes}
                onChange={(e) => setClasses(e.target.value)}
                className="h-10 bg-secondary/40"
              />
            </div>
          )}
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
        <SectionLabel>Current staff ({staff.length})</SectionLabel>
        {staff.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No staff yet" body="Add your first teacher or admin above." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {staff.map((s) => (
              <li
                key={s.username}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
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
  );
}
