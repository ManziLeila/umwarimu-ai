import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Gauge, CalendarCheck, LifeBuoy, Clock } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassPanel, InsightCard, MetricCard, SectionLabel, TrendBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import type { Lang } from "@/lib/app-context";
import { statusStyles } from "@/lib/mock-data";
import { getDashboardData } from "@/lib/dashboard.functions";

const CHART_COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const DASHBOARD_TREND_SUBJECT_CAP = 3;

function timeOfDayGreeting(lang: Lang): string {
  const hour = new Date().getHours();
  if (lang === "rw") return hour < 12 ? "Mwaramutse" : "Mwiriwe";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const Route = createFileRoute("/_app/dashboard")({
  loader: () => getDashboardData(),
  head: () => ({
    meta: [
      { title: "Dashboard · Umwarimu AI" },
      {
        name: "description",
        content:
          "AI command center for teachers: class metrics, early support alerts and Umwarimu AI insights.",
      },
      { property: "og:title", content: "Umwarimu AI Dashboard" },
      {
        property: "og:description",
        content: "Class performance, attendance and AI-generated student support insights.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useApp();
  const data = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const trendSubjects = data.subjects.slice(0, DASHBOARD_TREND_SUBJECT_CAP);
  const greeting = timeOfDayGreeting(lang);
  const firstName = session.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="animate-fade-up grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("dash.sub")}</p>
        </div>
        <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
          <Clock className="size-3.5" aria-hidden /> {t("common.lastUpdated")} just now
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("metric.students")}
          value={data.metrics.students}
          icon={<Users className="size-4" />}
          delta="Active learners"
          trend="flat"
        />
        <MetricCard
          label={t("metric.avg")}
          value={data.metrics.avgScore}
          suffix="%"
          icon={<Gauge className="size-4" />}
          delta={`${data.metrics.avgDelta >= 0 ? "+" : ""}${data.metrics.avgDelta}% vs previous 30 days`}
          trend={data.metrics.avgDelta > 0 ? "up" : data.metrics.avgDelta < 0 ? "down" : "flat"}
        />
        <MetricCard
          label={t("metric.attendance")}
          value={data.metrics.attendance}
          suffix="%"
          icon={<CalendarCheck className="size-4" />}
          delta={`${data.metrics.attendanceDelta >= 0 ? "+" : ""}${data.metrics.attendanceDelta}% vs prior period`}
          trend={
            data.metrics.attendanceDelta > 0
              ? "up"
              : data.metrics.attendanceDelta < 0
                ? "down"
                : "flat"
          }
        />
        <MetricCard
          label={t("metric.support")}
          value={data.metrics.needSupport}
          icon={<LifeBuoy className="size-4" />}
          delta="Flagged now"
          trend="flat"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="animate-fade-up p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionLabel>Class performance</SectionLabel>
              <p className="font-display mt-2 text-3xl font-bold">
                {data.metrics.avgScore}%{" "}
                <span className="text-muted-foreground text-sm font-normal">class average</span>
              </p>
              <TrendBadge
                trend={
                  data.metrics.avgDelta > 0 ? "up" : data.metrics.avgDelta < 0 ? "down" : "flat"
                }
                value={`${data.metrics.avgDelta >= 0 ? "+" : ""}${data.metrics.avgDelta}% vs previous 30 days`}
              />
            </div>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.performanceTrend} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  {trendSubjects.map((subject, i) => (
                    <linearGradient key={subject} id={`g-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={`var(--color-${CHART_COLORS[i % CHART_COLORS.length]})`}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={`var(--color-${CHART_COLORS[i % CHART_COLORS.length]})`}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-foreground)",
                  }}
                />
                {trendSubjects.map((subject, i) => (
                  <Area
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    name={subject}
                    stroke={`var(--color-${CHART_COLORS[i % CHART_COLORS.length]})`}
                    strokeWidth={2}
                    fill={`url(#g-${i})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <div className="animate-fade-up space-y-4">
          <InsightCard
            title={t("insight.title")}
            body={data.insight.body}
            bullet={data.insight.bullet}
            actionLabel={t("common.viewStudents")}
          />
          <GlassPanel className="p-5">
            <SectionLabel>{t("status.title")}</SectionLabel>
            <ul className="mt-4 space-y-3">
              {data.supportStatus.map((s) => (
                <li key={s.key} className="flex items-center gap-3">
                  <span
                    className={`${statusStyles[s.key].color} glow-dot size-2 shrink-0 rounded-full bg-current`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {statusStyles[s.key].label}
                  </span>
                  <span className="font-display text-sm font-bold">{s.count}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-4 text-xs">
              Support-first framing: every flagged learner gets a plan, not a penalty.
            </p>
          </GlassPanel>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Students to check in with</SectionLabel>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/students">View all</Link>
            </Button>
          </div>
          {data.studentsToCheckIn.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              No one flagged right now — nice work.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {data.studentsToCheckIn.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: s.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 transition-colors hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        Weakest area · {s.weakest}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] ${statusStyles[s.status].bg} ${statusStyles[s.status].color}`}
                      >
                        {statusStyles[s.status].label}
                      </span>
                      <span className="font-display w-10 text-right text-sm font-bold">
                        {s.overall}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel className="p-5">
          <SectionLabel>Recent activity</SectionLabel>
          {data.recentActivity.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">Nothing recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">{a.text}</p>
                    <p className="text-muted-foreground text-xs">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </section>
    </div>
  );
}
