import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, BookOpen, Lightbulb, CalendarRange } from "lucide-react";

import { AiOrb } from "@/components/AiOrb";
import { GlassPanel, SectionLabel, SkeletonBlock } from "@/components/kit";
import { LangToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { subjects } from "@/lib/mock-data";
import { askTutor } from "@/lib/tutor.functions";


export const Route = createFileRoute("/_app/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor · Umwarimu AI" },
      {
        name: "description",
        content:
          "Bilingual AI tutor for Rwandan learners: step-by-step explanations, practice sets and study plans in English and Kinyarwanda.",
      },
      { property: "og:title", content: "Umwarimu AI Tutor" },
      {
        property: "og:description",
        content: "Step-by-step explanations, practice and study plans in English and Kinyarwanda.",
      },
    ],
  }),
  component: Tutor,
});

type Msg = { id: number; role: "student" | "ai"; text: string };

const seed: Msg[] = [
  {
    id: 1,
    role: "student",
    text: "I don't understand how to simplify algebraic fractions.",
  },
  {
    id: 2,
    role: "ai",
    text: "Let's take it step by step. First, factor the numerator and denominator. Then cancel the factors they share. Example: (x² − 9)/(x + 3) becomes ((x − 3)(x + 3))/(x + 3) = x − 3, as long as x ≠ −3.",
  },
];

function Tutor() {
  const { t, lang } = useApp();
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [value, setValue] = useState("");
  const [subject, setSubject] = useState(subjects[0]);
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askTutor);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    const history = [...messages, { id: Date.now(), role: "student" as const, text: clean }];
    setMessages(history);
    setValue("");
    setThinking(true);
    try {
      const res = await ask({
        data: {
          lang,
          subject: subject ?? "",
          messages: history.map((m) => ({
            role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: m.text,
          })),
        },
      });
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: "ai", text: res.text || "I couldn't generate an answer. Please try again." },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "ai",
          text:
            lang === "rw"
              ? "Habaye ikibazo mu kubona igisubizo. Ongera ugerageze."
              : `Sorry, I couldn't reach the AI service. ${err instanceof Error ? err.message : ""}`.trim(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };


  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="animate-fade-up grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <AiOrb size={34} active={thinking} />
          <div className="min-w-0">
            <SectionLabel>Umwarimu AI Tutor</SectionLabel>
            <h1 className="mt-1 truncate text-xl font-bold sm:text-2xl">
              {thinking ? "Thinking…" : "Ask, learn, practise"}
            </h1>
          </div>
        </div>
        <LangToggle />
      </header>

      <div className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            aria-pressed={subject === s}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              subject === s
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <GlassPanel className="flex h-[26rem] flex-col overflow-hidden p-0 sm:h-[30rem]">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "animate-fade-up flex gap-3",
                m.role === "student" && "flex-row-reverse",
              )}
            >
              {m.role === "ai" ? (
                <AiOrb size={26} className="mt-1" />
              ) : (
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full border border-border text-[0.6rem]">
                  S
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "ai"
                    ? "border border-primary/25 bg-primary/[0.07]"
                    : "bg-secondary/60",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <AiOrb size={26} active className="mt-1" />
              <div className="w-52 space-y-2 rounded-2xl border border-primary/25 bg-primary/[0.07] p-4">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          <div className="flex flex-wrap gap-2 pb-3">
            <Button variant="glass" size="sm" onClick={() => send(`Give me practice questions on ${subject}`)}>
              <BookOpen /> {t("tutor.practice")}
            </Button>
            <Button variant="glass" size="sm" onClick={() => send("Explain that in simpler words")}>
              <Lightbulb /> {t("tutor.simpler")}
            </Button>
            <Button variant="glass" size="sm" onClick={() => send(`Build a 2-week ${subject} study plan`)}>
              <CalendarRange /> {t("tutor.plan")}
            </Button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(value);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("tutor.placeholder")}
              aria-label={t("tutor.placeholder")}
              className="h-11 rounded-xl bg-secondary/40"
            />
            <Button type="submit" variant="hero" size="icon" aria-label="Send message">
              <Send />
            </Button>
          </form>
        </div>
      </GlassPanel>

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Sparkles className="size-3.5" aria-hidden /> Responses follow the REB curriculum and are
        available in English and Kinyarwanda.
      </p>
    </div>
  );
}
