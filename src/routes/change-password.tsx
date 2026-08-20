import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AiOrb } from "@/components/AiOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, getCurrentSession } from "@/lib/login.functions";

export const Route = createFileRoute("/change-password")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
  head: () => ({ meta: [{ title: "Change password · Umwarimu AI" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({ data: { currentPassword, newPassword } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate({
        to:
          session.role === "student"
            ? "/portal/dashboard"
            : session.role === "network-admin"
              ? "/network"
              : "/dashboard",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-svh place-items-center px-4 py-12">
      <div className="glass-strong animate-fade-up w-full max-w-sm rounded-3xl p-7 text-center">
        <AiOrb size={38} active className="mx-auto" />
        <h1 className="font-display mt-5 text-xl font-bold tracking-[0.18em] uppercase">
          Choose a new password
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          You're signing in with a temporary password — set your own before continuing.
        </p>

        <form className="mt-7 space-y-4 text-left" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current">Current (temporary) password</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 bg-secondary/40"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 bg-secondary/40"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-risk text-xs">{error}</p>}
          <Button type="submit" variant="hero" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Saving…" : "Save and continue"}
          </Button>
        </form>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground mt-6 block text-xs transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
