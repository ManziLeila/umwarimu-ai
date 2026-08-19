// Pure logic only — same rule as validation.ts. No SpreadsheetApp/MailApp
// calls in this file, so it runs under Jest exactly as written.

import type { AttendanceEntry, ScoreEntry, SchoolConfig } from "./types";

export interface AtRiskSubjectScore {
  date: string;
  score: number;
  maxScore: number;
  pct: number;
}

export interface AtRiskSubject {
  subject: string;
  recentScores: AtRiskSubjectScore[];
}

export interface AttendanceRiskResult {
  isAtRisk: boolean;
  attendanceRatePct: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalDays: number;
  windowStart: string;
  windowEnd: string;
}

export interface AtRiskAssessment {
  studentId: string;
  atRiskSubjects: AtRiskSubject[];
  attendance: AttendanceRiskResult;
  isAtRisk: boolean;
}

export interface PriorAlert {
  studentId: string;
  dateSent: string;
  reasonFingerprint: string;
}

/**
 * 3 consecutive low scores in a subject (Feature 2). "Consecutive" means the
 * 3 most recent validated scores in that subject, by date — an older low
 * score outside that window doesn't count, and a subject needs at least 3
 * recorded scores to reach a verdict at all.
 */
export function detectLowScoreSubjects(scores: ScoreEntry[], lowScorePct: number): AtRiskSubject[] {
  const bySubject = new Map<string, ScoreEntry[]>();
  for (const entry of scores) {
    const list = bySubject.get(entry.subject) ?? [];
    list.push(entry);
    bySubject.set(entry.subject, list);
  }

  const result: AtRiskSubject[] = [];
  for (const [subject, entries] of bySubject) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const lastThree = sorted.slice(-3);
    if (lastThree.length < 3) continue;

    const withPct = lastThree.map((e) => ({
      date: e.date,
      score: e.score,
      maxScore: e.maxScore,
      pct: e.maxScore > 0 ? Math.round((e.score / e.maxScore) * 1000) / 10 : 0,
    }));
    if (withPct.every((e) => e.pct < lowScorePct)) {
      result.push({ subject, recentScores: withPct });
    }
  }
  return result;
}

/**
 * Attendance below threshold over a rolling period (Feature 2). "Late"
 * counts toward attendance — the student showed up, just not on time; only
 * "absent" counts against the rate. Flagging this as a judgment call: the
 * spec didn't define the formula.
 */
export function detectAttendanceRisk(
  attendance: AttendanceEntry[],
  config: Pick<SchoolConfig, "attendanceThresholdPct" | "rollingPeriodDays">,
  asOfDate: string,
): AttendanceRiskResult {
  const windowStart = addDays(asOfDate, -config.rollingPeriodDays);
  const inWindow = attendance.filter((a) => a.date >= windowStart && a.date <= asOfDate);

  const totalDays = inWindow.length;
  const presentDays = inWindow.filter((a) => a.attendanceStatus === "present").length;
  const lateDays = inWindow.filter((a) => a.attendanceStatus === "late").length;
  const absentDays = inWindow.filter((a) => a.attendanceStatus === "absent").length;
  const attendanceRatePct = totalDays === 0 ? 100 : Math.round(((presentDays + lateDays) / totalDays) * 1000) / 10;

  return {
    isAtRisk: totalDays > 0 && attendanceRatePct < config.attendanceThresholdPct,
    attendanceRatePct,
    presentDays,
    lateDays,
    absentDays,
    totalDays,
    windowStart,
    windowEnd: asOfDate,
  };
}

export function assessStudentRisk(
  studentId: string,
  scores: ScoreEntry[],
  attendance: AttendanceEntry[],
  config: SchoolConfig,
  asOfDate: string,
): AtRiskAssessment {
  const atRiskSubjects = detectLowScoreSubjects(scores, config.lowScorePct);
  const attendanceRisk = detectAttendanceRisk(attendance, config, asOfDate);
  return {
    studentId,
    atRiskSubjects,
    attendance: attendanceRisk,
    isAtRisk: atRiskSubjects.length > 0 || attendanceRisk.isAtRisk,
  };
}

/** Order-independent fingerprint of *why* a student is flagged, used to tell
 * "still the same problem" apart from "a new problem appeared". */
export function buildReasonFingerprint(assessment: AtRiskAssessment): string {
  const subjects = assessment.atRiskSubjects
    .map((s) => s.subject)
    .sort()
    .join(",");
  return `subjects:${subjects}|attendance:${assessment.attendance.isAtRisk}`;
}

/**
 * Prevents nightly-repeating the identical alert while a problem persists
 * unchanged (the spec asks for a nightly/weekly *sweep*, not a nightly
 * re-notification of the same parent about the same thing) — but still
 * sends right away if the pattern changes: a new subject flagged, or
 * attendance risk newly appearing or clearing.
 */
export function shouldSendAlert(
  assessment: AtRiskAssessment,
  priorAlerts: PriorAlert[],
  asOfDate: string,
  cooldownDays: number,
): { send: boolean; reasonFingerprint: string } {
  const reasonFingerprint = buildReasonFingerprint(assessment);
  if (!assessment.isAtRisk) return { send: false, reasonFingerprint };

  const mostRecentPrior = priorAlerts
    .filter((a) => a.studentId === assessment.studentId)
    .sort((a, b) => b.dateSent.localeCompare(a.dateSent))[0];

  if (!mostRecentPrior) return { send: true, reasonFingerprint };

  const sameReason = mostRecentPrior.reasonFingerprint === reasonFingerprint;
  const daysSince = daysBetween(mostRecentPrior.dateSent, asOfDate);

  if (sameReason && daysSince < cooldownDays) {
    return { send: false, reasonFingerprint };
  }
  return { send: true, reasonFingerprint };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86400000);
}
