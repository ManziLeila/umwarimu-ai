import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import loginBgAsset from "@/assets/classroom-dusk.png.asset.json";
import { AiOrb } from "@/components/AiOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginStep1, loginStep2 } from "@/lib/login.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Umwarimu AI" },
      {
        name: "description",
        content:
          "Sign in to Umwarimu AI, the student performance and guidance assistant for Rwandan schools.",
      },
      { property: "og:title", content: "Sign in · Umwarimu AI" },
      {
        property: "og:description",
        content: "Access your class dashboard, analytics and the bilingual AI tutor.",
      },
    ],
  }),
  component: Login,
});

type Step = { kind: "credentials" } | { kind: "otp"; otpToken: string; maskedEmail: string };

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginStep1({ data: { username, password } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep({ kind: "otp", otpToken: result.otpToken, maskedEmail: result.maskedEmail });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "otp") return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginStep2({ data: { otpToken: step.otpToken, code } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate({ to: result.role === "student" ? "/portal/dashboard" : "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-svh place-items-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <img
          src={loginBgAsset.url}
          alt="Quiet Rwandan classroom at dusk"
          width={1536}
          height={1024}
          className="size-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-background/75" />
        <div className="grid-lines absolute inset-0 opacity-30" />
      </div>

      <div className="glass-strong animate-fade-up w-full max-w-sm rounded-3xl p-7 text-center">
        <AiOrb size={38} active className="mx-auto" />
        <h1 className="font-display mt-5 text-xl font-bold tracking-[0.18em] uppercase">
          Umwarimu <span className="text-gradient">AI</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Student Performance &amp; Guidance Assistant
        </p>

        {step.kind === "credentials" ? (
          <form className="mt-7 space-y-4 text-left" onSubmit={handleCredentials}>
            <div className="space-y-2">
              <Label htmlFor="username">Username or email</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 bg-secondary/40"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-secondary/40"
                required
              />
            </div>
            {error && <p className="text-risk text-xs">{error}</p>}
            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Checking…" : "Sign In"}
            </Button>
          </form>
        ) : (
          <form className="mt-7 space-y-4 text-left" onSubmit={handleOtp}>
            <p className="text-muted-foreground text-sm">
              We sent a sign-in code to <span className="text-foreground">{step.maskedEmail}</span>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="code">Sign-in code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11 bg-secondary/40 text-center tracking-[0.3em]"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-risk text-xs">{error}</p>}
            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify and sign in"}
            </Button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground w-full text-center text-xs transition-colors"
              onClick={() => {
                setStep({ kind: "credentials" });
                setCode("");
                setError(null);
              }}
            >
              Use a different account
            </button>
          </form>
        )}

        <p className="text-muted-foreground mt-6 text-xs tracking-[0.2em] uppercase">
          Teacher · Admin · Student
        </p>
        <Link
          to="/signup"
          className="text-primary hover:text-primary/80 mt-4 inline-block text-xs transition-colors"
        >
          New school? Register here
        </Link>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground mt-2 block text-xs transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
