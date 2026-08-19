import { assessStudentRisk, shouldSendAlert } from "./atRisk";
import type { PriorAlert } from "./atRisk";
import { generateAlertSummary } from "./gemini";
import { listSchools } from "./registry";
import {
  readActiveStudents,
  readAlertLog,
  readSchoolConfig,
  readValidatedAttendance,
  readValidatedScores,
} from "./schoolData";
import { appendObjectRow, getHeaders } from "./sheetAccess";
import { buildFallbackSummary, buildGeminiPrompt } from "./summary";
import type { AlertLogRow } from "./types";

const ALERT_COOLDOWN_DAYS = 7;

/**
 * Runs on the nightly shared trigger (see triggers.ts). Loops every active
 * school; a failure in one school is logged and skipped rather than aborting
 * the whole sweep, so one bad spreadsheet can't silence every other school's
 * alerts.
 */
export function runNightlyAtRiskSweep(asOfDate: string = todayIso()): void {
  for (const school of listSchools()) {
    if (school.status !== "active") continue;
    try {
      sweepSchool(school.spreadsheetId, school.adminEmail, asOfDate);
    } catch (err) {
      Logger.log(`runNightlyAtRiskSweep failed for ${school.schoolId}: ${err}`);
    }
  }
}

function sweepSchool(spreadsheetId: string, schoolContactEmail: string, asOfDate: string): void {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const alertLogSheet = ss.getSheetByName("AlertLog");
  if (!alertLogSheet) return;

  const config = readSchoolConfig(ss);
  const students = readActiveStudents(ss);
  const scores = readValidatedScores(ss);
  const attendance = readValidatedAttendance(ss);
  const priorAlerts = toPriorAlerts(readAlertLog(ss));

  students.forEach((student) => {
    const studentScores = scores.filter((s) => s.studentId === student.studentId);
    const studentAttendance = attendance.filter((a) => a.studentId === student.studentId);
    const assessment = assessStudentRisk(
      student.studentId,
      studentScores,
      studentAttendance,
      config,
      asOfDate,
    );

    const { send, reasonFingerprint } = shouldSendAlert(
      assessment,
      priorAlerts,
      asOfDate,
      ALERT_COOLDOWN_DAYS,
    );
    if (!send) return;

    // Parent/teacher (school contact) — see README known-limitations: we
    // don't yet have a per-class/per-subject teacher mapping, so the school
    // admin stands in for "the relevant teacher" until that data model exists.
    const recipients = [student.guardianEmail, schoolContactEmail].filter((r): r is string =>
      Boolean(r),
    );
    if (recipients.length === 0) return;

    const summary = buildSummary(assessment, student.name);
    recipients.forEach((to) => sendAlertEmail(to, student.name, summary));

    const row: AlertLogRow = {
      studentId: student.studentId,
      reason: reasonFingerprint,
      subjects: assessment.atRiskSubjects.map((s) => s.subject).join(", "),
      dateSent: asOfDate,
      recipients: recipients.join(", "),
      alertId: `${student.studentId}-${asOfDate}`,
    };
    appendObjectRow(
      alertLogSheet,
      getHeaders(alertLogSheet),
      row as unknown as Record<string, unknown>,
    );
  });
}

function buildSummary(
  assessment: ReturnType<typeof assessStudentRisk>,
  studentName: string,
): string {
  const fallback = buildFallbackSummary(assessment, studentName);
  const gemini = generateAlertSummary(buildGeminiPrompt(assessment, studentName));
  if (!gemini.ok) {
    Logger.log(
      `Gemini summary failed for ${assessment.studentId}, using fallback text: ${gemini.error}`,
    );
    return fallback;
  }
  return gemini.text ?? fallback;
}

function sendAlertEmail(to: string, studentName: string, summary: string): void {
  MailApp.sendEmail({ to, subject: `Umwarimu AI: a heads-up about ${studentName}`, body: summary });
}

function toPriorAlerts(rows: AlertLogRow[]): PriorAlert[] {
  return rows.map((a) => ({
    studentId: a.studentId,
    dateSent: a.dateSent,
    reasonFingerprint: a.reason,
  }));
}

function todayIso(): string {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}
