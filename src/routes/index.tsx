import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  LineChart,
  Sparkles,
  ListChecks,
  Languages,
  Workflow,
  ArrowRight,
} from "lucide-react";

import heroAsset from "@/assets/classroom-dusk.png.asset.json";
import neuralImg from "@/assets/neural.jpg";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AiOrb, Logo } from "@/components/AiOrb";
import { GlassPanel, SectionLabel } from "@/components/kit";
import { LangToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Umwarimu AI · AI-Powered Education for Rwanda" },
      {
        name: "description",
        content:
          "Umwarimu AI turns student performance data into meaningful academic guidance: early support alerts, analytics and a bilingual AI tutor.",
      },
      { property: "og:title", content: "Umwarimu AI · AI-Powered Education" },
      {
        property: "og:description",
        content:
          "Smarter student support, earlier intervention, better learning — built for Rwandan classrooms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ShieldCheck,
    title: "Early Support",
    body: "Detect declining performance and attendance patterns weeks before exams, so intervention happens while it still matters.",
  },
  {
    icon: LineChart,
    title: "Intelligent Analytics",
    body: "Readable, interactive visualisations of class trends, subject strength and attendance across the academic year.",
  },
  {
    icon: Sparkles,
    title: "AI Tutor",
    body: "A patient, step-by-step tutor that explains concepts, generates practice and adapts to each learner's level.",
  },
  {
    icon: ListChecks,
    title: "Personalized Study Plans",
    body: "Weak areas become concrete weekly plans with practice sets, checkpoints and teacher visibility.",
  },
  {
    icon: Languages,
    title: "Bilingual Learning",
    body: "Full English and Kinyarwanda experience so language never stands between a learner and understanding.",
  },
  {
    icon: Workflow,
    title: "Automation",
    body: "Workflow automation handles marks import, guardian digests and support alerts without extra admin work.",
  },
];

const steps = [
  { n: "01", title: "Connect class data", body: "Import marks, attendance and subjects for your class." },
  { n: "02", title: "AI analyses patterns", body: "Trends, gaps and risk signals are detected per learner." },
  { n: "03", title: "Guidance is generated", body: "Insights become study plans and support recommendations." },
  { n: "04", title: "Teachers act early", body: "You intervene with context, not guesswork." },
];

function Landing() {
  return (
    <>
      <AmbientBackground />

      <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-6">
        <div className="glass-strong mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-2.5">
          <Link to="/" className="min-w-0">
            <Logo />
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground hidden px-3 py-2 text-sm transition-colors md:block"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-muted-foreground hover:text-foreground hidden px-3 py-2 text-sm transition-colors md:block"
            >
              How it works
            </a>
            <LangToggle />
            <Button variant="glass" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative flex min-h-svh items-center overflow-hidden px-4 pt-28 pb-16 sm:px-6">
          <div className="absolute inset-0 -z-10">
            <img
              src={heroAsset.url}
              alt="Empty Rwandan classroom at dusk with glowing neural network lines across the blackboard wall"
              width={1536}
              height={1024}
              className="size-full object-cover object-center opacity-90 brightness-[1.7] saturate-125"
            />
            <div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/40 to-background" />
            <div className="absolute inset-0 bg-linear-to-r from-background/85 via-background/35 to-transparent" />
          </div>

          <div className="animate-fade-up mx-auto w-full max-w-6xl">
            <div className="glass w-fit rounded-full px-3 py-1.5">
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <AiOrb size={14} active /> Built for Rwandan secondary schools · REB aligned
              </span>
            </div>
            <p className="font-display mt-8 text-[0.72rem] font-bold tracking-[0.4em] uppercase text-primary">
              Umwarimu AI
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl leading-[1.05] font-bold sm:text-6xl lg:text-7xl">
              AI-powered <span className="text-gradient">education</span>
            </h1>
            <p className="font-display mt-5 max-w-xl text-lg leading-snug sm:text-2xl">
              Smarter student support. Earlier intervention. Better learning.
            </p>
            <p className="text-muted-foreground mt-4 max-w-lg text-sm sm:text-base">
              Transform student performance data into meaningful academic guidance for every learner
              in your classroom.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/dashboard">
                  Start Exploring <ArrowRight />
                </Link>
              </Button>
              <Button variant="glass" size="lg" asChild>
                <Link to="/tutor">See Demo</Link>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                { k: "42", v: "learners tracked per class" },
                { k: "3 weeks", v: "earlier support detection" },
                { k: "2", v: "languages, one experience" },
              ].map((s) => (
                <div key={s.k} className="glass rounded-2xl p-4">
                  <dt className="font-display text-2xl font-bold">{s.k}</dt>
                  <dd className="text-muted-foreground mt-1 text-xs">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel>What Umwarimu AI does</SectionLabel>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Intelligent teaching support, not a replacement for teachers
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <GlassPanel key={f.title} hover className="p-5">
                <span className="text-primary grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                  <f.icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.body}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        {/* AI identity */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <GlassPanel className="grid items-center gap-8 overflow-hidden p-6 lg:grid-cols-2 lg:p-10">
            <div>
              <SectionLabel>Data visualisation</SectionLabel>
              <p className="font-display mt-4 text-6xl font-bold">67%</p>
              <p className="text-muted-foreground text-sm">Class average</p>
              <p className="text-success mt-4 text-sm">↗ +4.2% compared with previous month</p>
              <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
                <p className="font-display text-primary text-[0.7rem] font-bold tracking-[0.24em] uppercase">
                  ✦ AI Insight
                </p>
                <p className="mt-2 text-sm">
                  Performance is improving steadily. Mathematics remains the priority subject for
                  targeted support this term.
                </p>
              </div>
            </div>
            <img
              src={neuralImg}
              alt="Abstract neural network of connected nodes representing Umwarimu AI's analysis"
              width={1280}
              height={960}
              loading="lazy"
              className="aspect-4/3 w-full rounded-2xl object-cover opacity-80"
            />
          </GlassPanel>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">From raw marks to real guidance</h2>
          <ol className="relative mt-10 space-y-4 border-l border-border pl-6">
            {steps.map((s) => (
              <li key={s.n} className="relative">
                <span className="absolute top-2 -left-[1.83rem] size-3 rounded-full border-2 border-background bg-primary" />
                <GlassPanel className="p-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-display text-primary text-sm font-bold">{s.n}</span>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">{s.body}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
          <GlassPanel className="relative overflow-hidden p-10 text-center">
            <div className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
            <div className="relative">
              <AiOrb size={34} active className="mx-auto" />
              <h2 className="font-display mt-6 text-3xl leading-tight font-bold sm:text-4xl">
                Every student deserves the right support
                <br className="hidden sm:block" /> at the right time.
              </h2>
              <Button variant="hero" size="lg" className="mt-8" asChild>
                <Link to="/login">Get Started</Link>
              </Button>
            </div>
          </GlassPanel>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs">
          <Logo />
          <p>Umwarimu AI · Student performance &amp; guidance assistant · Kigali, Rwanda</p>
        </div>
      </footer>
    </>
  );
}
