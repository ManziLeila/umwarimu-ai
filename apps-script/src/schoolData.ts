// Shared readers for a single school's spreadsheet — used by both the
// nightly at-risk sweep (alerts.ts) and the dashboard/analytics/students API
// (api.ts), so "what counts as validated data for this school" is defined
// in exactly one place.

import { DEFAULT_SCHOOL_CONFIG } from "./config";
import { formatSheetDate, getHeaders, readRowsAsObjects } from "./sheetAccess";
import type { AlertLogRow, AttendanceEntry, ScoreEntry, SchoolConfig, Student } from "./types";

export function readSchoolConfig(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): SchoolConfig {
  const sheet = ss.getSheetByName("Config");
  if (!sheet) return { ...DEFAULT_SCHOOL_CONFIG };

  const rows = sheet.getDataRange().getValues().slice(1);
  const map = new Map(rows.map((r) => [String(r[0]), r[1]]));
  return {
    lowScorePct: Number(map.get("lowScorePct") ?? DEFAULT_SCHOOL_CONFIG.lowScorePct),
    attendanceThresholdPct: Number(
      map.get("attendanceThresholdPct") ?? DEFAULT_SCHOOL_CONFIG.attendanceThresholdPct,
    ),
    rollingPeriodDays: Number(
      map.get("rollingPeriodDays") ?? DEFAULT_SCHOOL_CONFIG.rollingPeriodDays,
    ),
  };
}

export function readActiveStudents(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): Student[] {
  const sheet = ss.getSheetByName("Students");
  if (!sheet) return [];
  return readRowsAsObjects<Student>(sheet)
    .filter((s) => s.status === "active")
    // A purely-numeric studentId (e.g. "2024001") gets read back from
    // Sheets as a JS number, not a string, since Sheets auto-types cells
    // that look numeric. Every consumer downstream expects a string.
    .map((s) => ({ ...s, studentId: String(s.studentId) }));
}

/** Only rows the ingestion pipeline has validated as "ok" — flagged/unprocessed rows never reach dashboards or alerts. */
export function readValidatedScores(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): ScoreEntry[] {
  const sheet = ss.getSheetByName("Scores");
  if (!sheet) return [];
  const headers = getHeaders(sheet);
  if (!headers.includes("_status")) return [];

  return readRowsAsObjects<Record<string, unknown>>(sheet)
    .filter((r) => r["_status"] === "ok")
    .map((r) => ({
      studentId: String(r["studentId"]),
      subject: String(r["subject"]),
      date: formatSheetDate(r["date"]),
      score: Number(r["score"]),
      maxScore: Number(r["maxScore"]),
    }));
}

export function readValidatedAttendance(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
): AttendanceEntry[] {
  const sheet = ss.getSheetByName("Attendance");
  if (!sheet) return [];
  const headers = getHeaders(sheet);
  if (!headers.includes("_status")) return [];

  return readRowsAsObjects<Record<string, unknown>>(sheet)
    .filter((r) => r["_status"] === "ok")
    .map((r) => ({
      studentId: String(r["studentId"]),
      date: formatSheetDate(r["date"]),
      attendanceStatus: String(
        r["attendanceStatus"],
      ).toLowerCase() as AttendanceEntry["attendanceStatus"],
    }));
}

export function readAlertLog(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): AlertLogRow[] {
  const sheet = ss.getSheetByName("AlertLog");
  if (!sheet) return [];
  return readRowsAsObjects<AlertLogRow>(sheet);
}
