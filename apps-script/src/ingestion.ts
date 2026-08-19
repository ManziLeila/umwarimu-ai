import { listSchools } from "./registry";
import { formatSheetDate, getHeaders, readRowsAsObjects } from "./sheetAccess";
import { attendanceKey, scoreKey, validateAttendanceEntries, validateScoreEntries } from "./validation";
import type { AttendanceEntry, DataIssueRow, ScoreEntry, Student } from "./types";

/**
 * Runs on a single shared time-driven trigger (see triggers.ts) rather than
 * a per-form onFormSubmit trigger. Apps Script caps triggers-per-user at 20;
 * two forms per school would exhaust that by roughly the 10th school. This
 * scans every active school's new rows every ~10 minutes instead — near
 * instant in practice, and O(1) triggers regardless of school count.
 */
export function pollAndValidateSubmissions(): void {
  for (const school of listSchools()) {
    if (school.status !== "active") continue;
    try {
      processSchool(school.spreadsheetId);
    } catch (err) {
      Logger.log(`pollAndValidateSubmissions failed for ${school.schoolId}: ${err}`);
    }
  }
}

function processSchool(spreadsheetId: string): void {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const studentsSheet = ss.getSheetByName("Students");
  const knownStudentIds = new Set(
    studentsSheet ? readRowsAsObjects<Student>(studentsSheet).map((s) => String(s.studentId)) : [],
  );

  processScores(ss, knownStudentIds);
  processAttendance(ss, knownStudentIds);
}

function processScores(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, knownStudentIds: Set<string>): void {
  const sheet = ss.getSheetByName("Scores");
  if (!sheet) return;
  const headers = getHeaders(sheet);
  const statusCol = headers.indexOf("_status") + 1;
  if (statusCol === 0) return;
  const flagReasonCol = headers.indexOf("_flagReason") + 1;
  const processedAtCol = headers.indexOf("_processedAt") + 1;

  const values = sheet.getDataRange().getValues();
  const existingKeys = new Set<string>();
  const pending: Array<{ rowIndex: number; entry: ScoreEntry }> = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const entry: ScoreEntry = {
      studentId: String(row[headers.indexOf("studentId")]),
      subject: String(row[headers.indexOf("subject")]),
      date: formatSheetDate(row[headers.indexOf("date")]),
      score: Number(row[headers.indexOf("score")]),
      maxScore: Number(row[headers.indexOf("maxScore")]),
    };
    const status = row[statusCol - 1];
    if (status === "ok" || status === "flagged") {
      existingKeys.add(scoreKey(entry));
      continue;
    }
    pending.push({ rowIndex: r + 1, entry });
  }
  if (pending.length === 0) return;

  const { flagged } = validateScoreEntries(pending.map((p) => p.entry), knownStudentIds, existingKeys);
  const flaggedByKey = new Map(flagged.map((f) => [scoreKey(f.entry), f.reason]));
  const now = new Date().toISOString();
  const issues: DataIssueRow[] = [];

  pending.forEach(({ rowIndex, entry }) => {
    const reason = flaggedByKey.get(scoreKey(entry));
    sheet.getRange(rowIndex, statusCol).setValue(reason ? "flagged" : "ok");
    sheet.getRange(rowIndex, processedAtCol).setValue(now);
    if (reason) {
      sheet.getRange(rowIndex, flagReasonCol).setValue(reason);
      issues.push({ detectedAt: now, sheet: "Scores", studentId: entry.studentId, reason, rawRow: JSON.stringify(entry) });
    }
  });

  if (issues.length > 0) appendDataIssues(ss, issues);
}

function processAttendance(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, knownStudentIds: Set<string>): void {
  const sheet = ss.getSheetByName("Attendance");
  if (!sheet) return;
  const headers = getHeaders(sheet);
  const statusCol = headers.indexOf("_status") + 1;
  if (statusCol === 0) return;
  const flagReasonCol = headers.indexOf("_flagReason") + 1;
  const processedAtCol = headers.indexOf("_processedAt") + 1;

  const values = sheet.getDataRange().getValues();
  const existingKeys = new Set<string>();
  const pending: Array<{ rowIndex: number; entry: AttendanceEntry }> = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const entry: AttendanceEntry = {
      studentId: String(row[headers.indexOf("studentId")]),
      date: formatSheetDate(row[headers.indexOf("date")]),
      attendanceStatus: String(row[headers.indexOf("attendanceStatus")]).toLowerCase() as AttendanceEntry["attendanceStatus"],
    };
    const status = row[statusCol - 1];
    if (status === "ok" || status === "flagged") {
      existingKeys.add(attendanceKey(entry));
      continue;
    }
    pending.push({ rowIndex: r + 1, entry });
  }
  if (pending.length === 0) return;

  const { flagged } = validateAttendanceEntries(pending.map((p) => p.entry), knownStudentIds, existingKeys);
  const flaggedByKey = new Map(flagged.map((f) => [attendanceKey(f.entry), f.reason]));
  const now = new Date().toISOString();
  const issues: DataIssueRow[] = [];

  pending.forEach(({ rowIndex, entry }) => {
    const reason = flaggedByKey.get(attendanceKey(entry));
    sheet.getRange(rowIndex, statusCol).setValue(reason ? "flagged" : "ok");
    sheet.getRange(rowIndex, processedAtCol).setValue(now);
    if (reason) {
      sheet.getRange(rowIndex, flagReasonCol).setValue(reason);
      issues.push({
        detectedAt: now,
        sheet: "Attendance",
        studentId: entry.studentId,
        reason,
        rawRow: JSON.stringify(entry),
      });
    }
  });

  if (issues.length > 0) appendDataIssues(ss, issues);
}

function appendDataIssues(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, issues: DataIssueRow[]): void {
  const sheet = ss.getSheetByName("DataIssues");
  if (!sheet) return;
  const headers = getHeaders(sheet);
  issues.forEach((issue) => {
    sheet.appendRow(headers.map((h) => (issue as unknown as Record<string, unknown>)[h] ?? ""));
  });
}
