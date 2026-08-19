// Pure logic only — same rule as validation.ts/atRisk.ts. Shapes the raw
// per-school data (Students/Scores/Attendance/AlertLog + Config) into
// exactly what the dashboard/analytics/students pages need, reusing
// atRisk.ts's detection rules so "at risk" means the same thing everywhere.

import { assessStudentRisk, detectAttendanceRisk } from "./atRisk";
import type { AtRiskAssessment } from "./atRisk";
import type { AlertLogRow, AttendanceEntry, ScoreEntry, SchoolConfig, Student } from "./types";

/** Empty/absent classes means "no filter" — an admin passes none and sees
 * the whole school; a teacher passes their own assigned class(es) and only
 * sees those students. */
export function filterByClasses<T extends { className: string }>(
  students: T[],
  classes: string[],
): T[] {
  if (classes.length === 0) return students;
  return students.filter((s) => classes.includes(s.className));
}

export type StudentStatus = "on-track" | "improving" | "support" | "risk";

export interface StudentSummary {
  id: string;
  name: string;
  className: string;
  overall: number;
  attendance: number;
  trend: "up" | "down" | "flat";
  status: StudentStatus;
  weakest: string;
}

export interface SubjectScorePoint {
  subject: string;
  score: number;
}

export interface AssessmentPoint {
  name: string;
  date: string;
  score: number;
}

export interface StudentDetail extends StudentSummary {
  subjects: SubjectScorePoint[];
  assessments: AssessmentPoint[];
  notes: Array<{ author: string; date: string; text: string }>;
  recommendations: string[];
  /** Subjects currently flagged by the same 3-consecutive-low-scores rule
   * used for at-risk alerts — empty if none are flagged right now. */
  weakSubjects: string[];
}

export interface TrendPoint {
  period: string;
  [subject: string]: string | number;
}

export interface DashboardMetrics {
  students: number;
  avgScore: number;
  attendance: number;
  needSupport: number;
  avgDelta: number;
  attendanceDelta: number;
}

export interface SupportStatusCount {
  key: StudentStatus;
  label: string;
  count: number;
}

export interface ActivityItem {
  text: string;
  time: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  performanceTrend: TrendPoint[];
  supportStatus: SupportStatusCount[];
  studentsToCheckIn: StudentSummary[];
  recentActivity: ActivityItem[];
  insight: { body: string; bullet: string };
  subjects: string[];
}

export interface AnalyticsData {
  avgScore: number;
  avgDelta: number;
  highestSubject: string;
  lowestSubject: string;
  attendance: number;
  performanceTrend: TrendPoint[];
  subjectAverages: Array<{ subject: string; average: number }>;
  attendanceByWeek: Array<{ week: string; attendance: number }>;
  attendanceVsPerformance: Array<{
    studentId: string;
    name: string;
    attendance: number;
    avgScore: number;
  }>;
  subjects: string[];
}

const STATUS_LABELS: Record<StudentStatus, string> = {
  "on-track": "On Track",
  improving: "Improving",
  support: "Need Support",
  risk: "At Risk",
};

function scorePct(entry: Pick<ScoreEntry, "score" | "maxScore">): number {
  return entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function averagePct(entries: ScoreEntry[]): number {
  if (entries.length === 0) return 0;
  return round1(entries.reduce((sum, e) => sum + scorePct(e), 0) / entries.length);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface PeriodTrend {
  recentAvg: number;
  hasRecentData: boolean;
  delta: number;
  trend: "up" | "down" | "flat";
}

/** Recent-30-days vs prior-30-days comparison, used for both per-student
 * and school-wide trend deltas. Falls back to the all-time average when
 * there's no data in the recent window at all. */
function periodDelta(scores: ScoreEntry[], asOfDate: string, windowDays = 30): PeriodTrend {
  const recentStart = addDays(asOfDate, -windowDays);
  const priorStart = addDays(asOfDate, -windowDays * 2);
  const recent = scores.filter((s) => s.date > recentStart && s.date <= asOfDate);
  const prior = scores.filter((s) => s.date > priorStart && s.date <= recentStart);

  const hasRecentData = recent.length > 0;
  const recentAvg = hasRecentData ? averagePct(recent) : averagePct(scores);

  if (!hasRecentData || prior.length === 0) {
    return { recentAvg, hasRecentData, delta: 0, trend: "flat" };
  }

  const delta = round1(recentAvg - averagePct(prior));
  const trend = delta > 1 ? "up" : delta < -1 ? "down" : "flat";
  return { recentAvg, hasRecentData, delta, trend };
}

/** Judgment call, flagged: "risk" vs "support" isn't specified anywhere in
 * the brief. Two or more simultaneous flags (e.g. a low-score subject AND
 * attendance risk) reads as "risk"; a single flag reads as "support". */
function statusFromAssessment(
  assessment: AtRiskAssessment,
  trend: "up" | "down" | "flat",
): StudentStatus {
  if (assessment.isAtRisk) {
    const severity = assessment.atRiskSubjects.length + (assessment.attendance.isAtRisk ? 1 : 0);
    return severity >= 2 ? "risk" : "support";
  }
  return trend === "up" ? "improving" : "on-track";
}

function weakestSubject(scores: ScoreEntry[]): string {
  const bySubject = groupBySubject(scores);
  let weakest = "";
  let lowest = Infinity;
  for (const [subject, entries] of bySubject) {
    const avg = averagePct(entries);
    if (avg < lowest) {
      lowest = avg;
      weakest = subject;
    }
  }
  return weakest;
}

function groupBySubject(scores: ScoreEntry[]): Map<string, ScoreEntry[]> {
  const bySubject = new Map<string, ScoreEntry[]>();
  scores.forEach((s) => {
    const list = bySubject.get(s.subject) ?? [];
    list.push(s);
    bySubject.set(s.subject, list);
  });
  return bySubject;
}

function distinctSubjects(scores: ScoreEntry[]): string[] {
  return Array.from(new Set(scores.map((s) => s.subject))).sort();
}

export function summarizeStudent(
  student: Student,
  scores: ScoreEntry[],
  attendance: AttendanceEntry[],
  config: SchoolConfig,
  asOfDate: string,
): StudentSummary {
  const assessment = assessStudentRisk(student.studentId, scores, attendance, config, asOfDate);
  const { recentAvg, trend } = periodDelta(scores, asOfDate);
  const attendanceRisk = detectAttendanceRisk(attendance, config, asOfDate);

  return {
    id: student.studentId,
    name: student.name,
    className: student.className,
    overall: Math.round(recentAvg),
    attendance: Math.round(attendanceRisk.attendanceRatePct),
    trend,
    status: statusFromAssessment(assessment, trend),
    weakest: weakestSubject(scores) || "—",
  };
}

export function buildStudentDetail(
  student: Student,
  scores: ScoreEntry[],
  attendance: AttendanceEntry[],
  config: SchoolConfig,
  asOfDate: string,
): StudentDetail {
  const summary = summarizeStudent(student, scores, attendance, config, asOfDate);
  const assessment = assessStudentRisk(student.studentId, scores, attendance, config, asOfDate);

  const subjects: SubjectScorePoint[] = Array.from(groupBySubject(scores).entries()).map(
    ([subject, entries]) => ({
      subject,
      score: Math.round(averagePct(entries)),
    }),
  );

  const assessments: AssessmentPoint[] = [...scores]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6)
    .map((s) => ({
      name: `${s.subject} · ${s.date}`,
      date: s.date,
      score: Math.round(scorePct(s)),
    }));

  const recommendations: string[] = [];
  if (assessment.atRiskSubjects.length > 0) {
    recommendations.push(
      `Focus 20 minutes daily on ${assessment.atRiskSubjects[0].subject} fundamentals.`,
    );
  }
  if (assessment.attendance.isAtRisk) {
    recommendations.push(
      "Check in on attendance — recent days show a pattern worth a conversation with the family.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("Keep up the consistent work — no flags right now.");
  }

  return {
    ...summary,
    subjects,
    assessments,
    notes: [], // no teacher-notes feature exists yet — flagged, not fabricated
    recommendations,
    weakSubjects: assessment.atRiskSubjects.map((s) => s.subject),
  };
}

export function buildPerformanceTrend(
  scores: ScoreEntry[],
  subjects: string[],
  months = 6,
): TrendPoint[] {
  const byMonth = new Map<string, ScoreEntry[]>();
  scores.forEach((s) => {
    const month = s.date.slice(0, 7); // yyyy-MM
    const list = byMonth.get(month) ?? [];
    list.push(s);
    byMonth.set(month, list);
  });

  const sortedMonths = [...byMonth.keys()].sort().slice(-months);
  return sortedMonths.map((month) => {
    const monthEntries = byMonth.get(month) ?? [];
    const point: TrendPoint = { period: formatMonthLabel(month) };
    subjects.forEach((subject) => {
      const subjectEntries = monthEntries.filter((e) => e.subject === subject);
      point[subject] = subjectEntries.length > 0 ? Math.round(averagePct(subjectEntries)) : 0;
    });
    return point;
  });
}

function formatMonthLabel(yyyyMM: string): string {
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = Number(yyyyMM.split("-")[1]);
  return names[month - 1] ?? yyyyMM;
}

export function buildSubjectAverages(
  scores: ScoreEntry[],
  subjects: string[],
): Array<{ subject: string; average: number }> {
  return subjects.map((subject) => ({
    subject,
    average: Math.round(averagePct(scores.filter((s) => s.subject === subject))),
  }));
}

export function buildAttendanceByWeek(
  attendance: AttendanceEntry[],
  asOfDate: string,
  weeks = 6,
): Array<{ week: string; attendance: number }> {
  const result: Array<{ week: string; attendance: number }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = addDays(asOfDate, -7 * i);
    const weekStart = addDays(weekEnd, -6);
    const inWeek = attendance.filter((a) => a.date >= weekStart && a.date <= weekEnd);
    const present = inWeek.filter(
      (a) => a.attendanceStatus === "present" || a.attendanceStatus === "late",
    ).length;
    result.push({
      week: `W${weeks - i}`,
      attendance: inWeek.length > 0 ? Math.round((present / inWeek.length) * 100) : 100,
    });
  }
  return result;
}

export function buildDashboardData(
  students: Student[],
  scores: ScoreEntry[],
  attendance: AttendanceEntry[],
  alerts: AlertLogRow[],
  config: SchoolConfig,
  asOfDate: string,
): DashboardData {
  const summaries = students.map((student) =>
    summarizeStudent(
      student,
      scores.filter((s) => s.studentId === student.studentId),
      attendance.filter((a) => a.studentId === student.studentId),
      config,
      asOfDate,
    ),
  );

  const subjects = distinctSubjects(scores);
  const schoolTrend = periodDelta(scores, asOfDate);
  const currentAttendance = detectAttendanceRisk(attendance, config, asOfDate);
  const priorAttendance = detectAttendanceRisk(
    attendance,
    config,
    addDays(asOfDate, -config.rollingPeriodDays),
  );

  const needSupport = summaries.filter((s) => s.status === "support" || s.status === "risk").length;
  const subjectAverages = buildSubjectAverages(scores, subjects);
  const lowestAvgSubject = [...subjectAverages].sort((a, b) => a.average - b.average)[0];

  const studentsToCheckIn = [
    ...summaries.filter((s) => s.status === "support" || s.status === "risk"),
    ...summaries.filter((s) => s.status === "improving"),
  ].slice(0, 5);

  return {
    metrics: {
      students: students.length,
      avgScore: Math.round(schoolTrend.recentAvg),
      attendance: Math.round(currentAttendance.attendanceRatePct),
      needSupport,
      avgDelta: schoolTrend.delta,
      attendanceDelta: round1(
        currentAttendance.attendanceRatePct - priorAttendance.attendanceRatePct,
      ),
    },
    performanceTrend: buildPerformanceTrend(scores, subjects),
    supportStatus: (["on-track", "improving", "support", "risk"] as const).map((key) => ({
      key,
      label: STATUS_LABELS[key],
      count: summaries.filter((s) => s.status === key).length,
    })),
    studentsToCheckIn,
    recentActivity: buildRecentActivity(alerts, scores),
    insight: buildInsight(lowestAvgSubject, needSupport),
    subjects,
  };
}

function buildInsight(
  lowestAvgSubject: { subject: string; average: number } | undefined,
  needSupport: number,
): { body: string; bullet: string } {
  if (!lowestAvgSubject) {
    return {
      body: "Not enough data yet to generate an insight.",
      bullet: "Add scores and attendance to see trends here.",
    };
  }
  return {
    body: `${lowestAvgSubject.subject} has the lowest class average right now, at ${lowestAvgSubject.average}%.`,
    bullet: `${needSupport} student(s) may need additional support this week.`,
  };
}

/** Real events only — no fabricated activity log exists, so this is built
 * from actual AlertLog rows and actual recorded scores, not invented text. */
function buildRecentActivity(alerts: AlertLogRow[], scores: ScoreEntry[]): ActivityItem[] {
  const alertItems = alerts.slice(-5).map((a) => ({
    text: `Support alert sent for student ${a.studentId} (${a.subjects || "attendance"})`,
    time: a.dateSent,
  }));
  const scoreItems = [...scores]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5)
    .map((s) => ({ text: `${s.subject} score recorded for student ${s.studentId}`, time: s.date }));

  return [...alertItems, ...scoreItems].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);
}

export function buildAnalyticsData(
  students: Student[],
  scores: ScoreEntry[],
  attendance: AttendanceEntry[],
  config: SchoolConfig,
  asOfDate: string,
): AnalyticsData {
  const subjects = distinctSubjects(scores);
  const subjectAverages = buildSubjectAverages(scores, subjects);
  const sorted = [...subjectAverages].sort((a, b) => b.average - a.average);
  const schoolTrend = periodDelta(scores, asOfDate);
  const attendanceRisk = detectAttendanceRisk(attendance, config, asOfDate);

  const attendanceVsPerformance = students.map((student) => {
    const studentScores = scores.filter((s) => s.studentId === student.studentId);
    const studentAttendance = attendance.filter((a) => a.studentId === student.studentId);
    return {
      studentId: student.studentId,
      name: student.name,
      attendance: Math.round(
        detectAttendanceRisk(studentAttendance, config, asOfDate).attendanceRatePct,
      ),
      avgScore: Math.round(averagePct(studentScores)),
    };
  });

  return {
    avgScore: Math.round(schoolTrend.recentAvg),
    avgDelta: schoolTrend.delta,
    highestSubject: sorted[0]?.subject ?? "—",
    lowestSubject: sorted[sorted.length - 1]?.subject ?? "—",
    attendance: Math.round(attendanceRisk.attendanceRatePct),
    performanceTrend: buildPerformanceTrend(scores, subjects),
    subjectAverages,
    attendanceByWeek: buildAttendanceByWeek(attendance, asOfDate),
    attendanceVsPerformance,
    subjects,
  };
}
