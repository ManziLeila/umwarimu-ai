import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import loginBgAsset from "@/assets/classroom-dusk.png.asset.json";
import { AiOrb } from "@/components/AiOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpSchool } from "@/lib/signup.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up your school · Umwarimu AI" },
      {
        name: "description",
        content:
          "Register your school on Umwarimu AI. For schools only — teachers and students are added by your admin afterward.",
      },
    ],
  }),
  component: SignUp,
});

type Result = { ok: true; emailSent: boolean; tempPassword?: string | undefined } | null;

function SignUp() {
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await signUpSchool({
        data: { schoolName, district, adminName, adminEmail, adminUsername },
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="relative grid min-h-svh place-items-center px-4 py-12">
        <BackgroundImage />
        <div className="glass-strong animate-fade-up w-full max-w-sm rounded-3xl p-7 text-center">
          <AiOrb size={38} active className="mx-auto" />
          <h1 className="font-display mt-5 text-xl font-bold tracking-[0.18em] uppercase">
            School registered
          </h1>
          {result.emailSent ? (
            <p className="text-muted-foreground mt-3 text-sm">
              We emailed <span className="text-foreground">{adminEmail}</span> your username and a
              temporary password. Use them to sign in — you'll be asked to choose your own password
              first.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-left">
              <p className="text-risk text-sm">
                We couldn't send the welcome email, so here's your temporary password — save it now:
              </p>
              <p className="glass rounded-xl p-3 text-center font-mono text-sm">
                {result.tempPassword}
              </p>
              <p className="text-muted-foreground text-xs">
                Username: <span className="text-foreground">{adminUsername}</span>
              </p>
            </div>
          )}
          <Button variant="hero" className="mt-6 w-full" size="lg" asChild>
            <Link to="/login">Continue to sign in</Link>
          </Button>
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

  return (
    <main className="relative grid min-h-svh place-items-center px-4 py-12">
      <BackgroundImage />
      <div className="glass-strong animate-fade-up w-full max-w-md rounded-3xl p-7 text-center">
        <AiOrb size={38} active className="mx-auto" />
        <h1 className="font-display mt-5 text-xl font-bold tracking-[0.18em] uppercase">
          Register your school
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          For schools only — you'll be the first admin, and can add teachers and students afterward.
        </p>

        <form className="mt-7 space-y-4 text-left" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="schoolName">School name</Label>
            <Input
              id="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="h-11 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-11 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminName">Your name</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="h-11 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Your email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="h-11 bg-secondary/40"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminUsername">Choose a username</Label>
            <Input
              id="adminUsername"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="h-11 bg-secondary/40"
              required
            />
          </div>
          {error && <p className="text-risk text-xs">{error}</p>}
          <Button type="submit" variant="hero" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Creating…" : "Register school"}
          </Button>
        </form>

        <Link
          to="/login"
          className="text-muted-foreground hover:text-foreground mt-6 inline-block text-xs transition-colors"
        >
          Already registered? Sign in
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

function BackgroundImage() {
  return (
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
  );
}
