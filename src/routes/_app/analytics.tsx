import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { GlassPanel, InsightCard, SectionLabel, TrendBadge } from "@/components/kit";
import { cn } from "@/lib/utils";
import { getAnalyticsData } from "@/lib/analytics.functions";

const CHART_COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const ALL_SUBJECTS = "All subjects";

export const Route = createFileRoute("/_app/analytics")({
  loader: () => getAnalyticsData(),
  head: () => ({
    meta: [
      { title: "Analytics · Umwarimu AI" },
      {
        name: "description",
        content:
          "Readable futuristic analytics: performance trends, subject averages and attendance over time.",
      },
      { property: "og:title", content: "Analytics · Umwarimu AI" },
      {
        property: "og:description",
        content: "Performance trends, subject averages and attendance analytics for your class.",
      },
    ],
  }),
  component: Analytics,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  color: "var(--color-foreground)",
};

const axis = {
  stroke: "var(--color-muted-foreground)",
  tickLine: false,
  axisLine: false,
  fontSize: 12,
} as const;

function Analytics() {
  const data = Route.useLoaderData();
  const [subject, setSubject] = useState<string>(ALL_SUBJECTS);

  const linesToShow = subject === ALL_SUBJECTS ? data.subjects.slice(0, 5) : [subject];
  const trend = data.avgDelta > 0 ? "up" : data.avgDelta < 0 ? "down" : "flat";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Analytics</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Class intelligence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Performance, subjects and attendance for every recorded score and attendance entry.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <GlassPanel className="animate-fade-up p-5 lg:col-span-1">
          <SectionLabel>Class average</SectionLabel>
          <p className="font-display mt-3 text-5xl font-bold">{data.avgScore}%</p>
          <TrendBadge
            trend={trend}
            value={`${data.avgDelta >= 0 ? "+" : ""}${data.avgDelta}% vs previous 30 days`}
          />
          <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Highest subject</span>
              <span>{data.highestSubject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lowest subject</span>
              <span>{data.lowestSubject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attendance</span>
              <span>{data.attendance}%</span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="animate-fade-up p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>Performance trend</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {[ALL_SUBJECTS, ...data.subjects].map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  aria-pressed={subject === s}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[0.7rem] transition-colors",
                    subject === s
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.performanceTrend} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="period" {...axis} />
                <YAxis domain={[0, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {linesToShow.map((s, i) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={s}
                    stroke={`var(--color-${CHART_COLORS[i % CHART_COLORS.length]})`}
                    strokeWidth={2.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-5 lg:col-span-2">
          <SectionLabel>Subject averages</SectionLabel>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.subjectAverages} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="subject"
                  {...axis}
                  interval={0}
                  tickFormatter={(v: string) => v.slice(0, 5)}
                />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar
                  dataKey="average"
                  name="Average"
                  fill="var(--color-chart-2)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-5">
            <SectionLabel>Attendance</SectionLabel>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendanceByWeek} margin={{ left: -28, right: 4, top: 6 }}>
                  <defs>
                    <linearGradient id="g-att" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" {...axis} />
                  <YAxis domain={[0, 100]} {...axis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="Attendance"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    fill="url(#g-att)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
          <InsightCard
            title="AI interpretation"
            body={`${data.highestSubject} is the strongest subject right now; ${data.lowestSubject} has the most room to grow.`}
            bullet={`Class average moved ${data.avgDelta >= 0 ? "up" : "down"} ${Math.abs(data.avgDelta)}% over the last 30 days.`}
          />
        </div>
      </section>

      <section>
        <GlassPanel className="p-5">
          <SectionLabel>Attendance vs. performance</SectionLabel>
          <p className="text-muted-foreground mt-1 text-xs">
            Each point is one student — attendance rate against average score, so patterns between
            the two are easy to spot.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  dataKey="attendance"
                  name="Attendance"
                  unit="%"
                  domain={[0, 100]}
                  {...axis}
                />
                <YAxis
                  type="number"
                  dataKey="avgScore"
                  name="Avg score"
                  unit="%"
                  domain={[0, 100]}
                  {...axis}
                />
                <ZAxis range={[80, 80]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                  labelFormatter={() => ""}
                />
                <Scatter
                  data={data.attendanceVsPerformance}
                  name="Students"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.75}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}
