import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassPanel, InsightCard, SectionLabel, TrendBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { statusStyles } from "@/lib/mock-data";
import { getStudentDetailData } from "@/lib/students.functions";
import { generateStudyPlan } from "@/lib/studyPlan.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/students/$studentId")({
  loader: async ({ params }) => {
    try {
      const student = await getStudentDetailData({ data: { studentId: params.studentId } });
      return { student };
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "Student Profile · Umwarimu AI" },
      {
        name: "description",
        content:
          "Human-centered learner profile: subject performance, assessments, attendance and AI recommendations.",
      },
      { property: "og:title", content: "Student Profile · Umwarimu AI" },
      {
        property: "og:description",
        content: "Subject performance, assessments, attendance and AI recommendations.",
      },
    ],
  }),
  component: StudentProfile,
});

const chartTooltip = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  color: "var(--color-foreground)",
};

function StudentProfile() {
  const { student } = Route.useLoaderData();
  const { lang } = useApp();
  const status = statusStyles[student.status];
  const weakAreas =
    student.weakSubjects.length > 0
      ? student.weakSubjects
      : student.weakest !== "—"
        ? [student.weakest]
        : [];

  const [plan, setPlan] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const askForPlan = useServerFn(generateStudyPlan);

  const handleGeneratePlan = async () => {
    if (weakAreas.length === 0 || generating) return;
    setGenerating(true);
    try {
      const result = await askForPlan({
        data: { studentName: student.name, weakSubjects: weakAreas, lang },
      });
      setPlan(result.text);
    } catch (err) {
      setPlan(
        err instanceof Error ? err.message : "Sorry, I couldn't generate a study plan right now.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/students">
          <ArrowLeft /> Back to students
        </Link>
      </Button>

      <GlassPanel className="animate-fade-up relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -top-24 right-0 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <span className="font-display grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-lg font-bold text-primary">
              {student.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div className="min-w-0">
              <SectionLabel>Student profile</SectionLabel>
              <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{student.name}</h1>
              <p className="text-muted-foreground truncate text-sm">{student.className}</p>
            </div>
          </div>
          <span
            className={cn("w-fit rounded-full border px-3 py-1.5 text-xs", status.bg, status.color)}
          >
            {status.label}
          </span>
        </div>
        <dl className="relative mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Overall performance", value: `${student.overall}%` },
            { label: "Attendance", value: `${student.attendance}%` },
            { label: "Learning trend", value: null },
          ].map((item) => (
            <div key={item.label} className="glass rounded-2xl p-4">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="font-display mt-1 text-2xl font-bold">
                {item.value ?? (
                  <TrendBadge
                    trend={student.trend}
                    value={
                      student.trend === "up"
                        ? "Improving"
                        : student.trend === "down"
                          ? "Declining"
                          : "Steady"
                    }
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-5 lg:col-span-2">
          <SectionLabel>Subject performance</SectionLabel>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={student.subjects} margin={{ left: -20, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="subject"
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval={0}
                  tickFormatter={(v: string) => v.slice(0, 4)}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip contentStyle={chartTooltip} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar
                  dataKey="score"
                  name="Score"
                  fill="var(--color-chart-1)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <InsightCard
            title="Umwarimu AI recommendations"
            body={`${student.name.split(" ")[0]} is strongest in consistent daily work but loses marks on ${student.weakest} problem solving.`}
            bullet={student.recommendations[0]}
            actionLabel={weakAreas.length > 0 ? "Generate study plan" : undefined}
            onAction={handleGeneratePlan}
            generating={generating}
          />
          {plan && (
            <GlassPanel className="animate-fade-up p-5">
              <SectionLabel>2-week study plan</SectionLabel>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-line">
                {plan}
              </p>
            </GlassPanel>
          )}
          <GlassPanel className="p-5">
            <SectionLabel>Next steps</SectionLabel>
            <ul className="mt-3 space-y-2.5 text-sm">
              {student.recommendations.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-5 lg:col-span-2">
          <SectionLabel>Recent assessments</SectionLabel>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={student.assessments} margin={{ left: -20, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip contentStyle={chartTooltip} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-chart-2)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 divide-y divide-border text-sm">
            {student.assessments.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate">{a.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{a.date}</span>
                <span className="font-display shrink-0 font-bold">{a.score}%</span>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="p-5">
          <SectionLabel>Teacher notes</SectionLabel>
          <ul className="mt-4 space-y-4">
            {student.notes.map((n) => (
              <li key={n.text} className="glass rounded-xl p-3">
                <p className="text-sm leading-snug">{n.text}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {n.author} · {n.date}
                </p>
              </li>
            ))}
          </ul>
          <Button variant="glass" size="sm" className="mt-4 w-full">
            Add note
          </Button>
        </GlassPanel>
      </div>
    </div>
  );
}
