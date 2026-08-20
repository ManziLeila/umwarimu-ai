// In-app marks/attendance entry — lets a teacher write straight to their
// school's Scores/Attendance sheets and get validation feedback immediately,
// instead of waiting for the shared poll trigger (ingestion.ts) to flag a
// bad row minutes later. That trigger stays in place as the path for
// anything still submitted via the kept Google Form.

import { readActiveStudents } from "./schoolData";
import { appendObjectRow, formatSheetDate, getHeaders } from "./sheetAccess";
import { attendanceKey, scoreKey, validateAttendanceEntries, validateScoreEntries } from "./validation";
import type { AttendanceEntry, ScoreEntry, Student } from "./types";

export interface SubmitResult<T> {
  written: number;
  flagged: Array<{ entry: T; reason: string }>;
}

/** Empty `allowedClasses` means unrestricted (admin view of the whole school). */
export function scopeToClasses(students: Student[], allowedClasses: string[]): Student[] {
  if (allowedClasses.length === 0) return students;
  const allowed = new Set(allowedClasses);
  return students.filter((s) => allowed.has(s.className));
}

export function submitScores(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  entries: ScoreEntry[],
  allowedClasses: string[],
): SubmitResult<ScoreEntry> {
  const sheet = ss.getSheetByName("Scores");
  if (!sheet) throw new Error("Scores sheet not found for this school.");

  const knownStudentIds = new Set(
    scopeToClasses(readActiveStudents(ss), allowedClasses).map((s) => s.studentId),
  );
  const headers = getHeaders(sheet);
  const idIdx = headers.indexOf("studentId");
  const subjectIdx = headers.indexOf("subject");
  const dateIdx = headers.indexOf("date");
  const existingKeys = readExistingKeys(sheet, (row) =>
    scoreKey({
      studentId: String(row[idIdx]),
      subject: String(row[subjectIdx]),
      date: formatSheetDate(row[dateIdx]),
    }),
  );

  const { valid, flagged } = validateScoreEntries(entries, knownStudentIds, existingKeys);
  const now = new Date().toISOString();
  valid.forEach((entry) => {
    appendObjectRow(sheet, headers, {
      Timestamp: now,
      ...entry,
      _status: "ok",
      _flagReason: "",
      _processedAt: now,
    });
  });
  return { written: valid.length, flagged };
}

export function submitAttendance(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  entries: AttendanceEntry[],
  allowedClasses: string[],
): SubmitResult<AttendanceEntry> {
  const sheet = ss.getSheetByName("Attendance");
  if (!sheet) throw new Error("Attendance sheet not found for this school.");

  const knownStudentIds = new Set(
    scopeToClasses(readActiveStudents(ss), allowedClasses).map((s) => s.studentId),
  );
  const headers = getHeaders(sheet);
  const idIdx = headers.indexOf("studentId");
  const dateIdx = headers.indexOf("date");
  const existingKeys = readExistingKeys(sheet, (row) =>
    attendanceKey({ studentId: String(row[idIdx]), date: formatSheetDate(row[dateIdx]) }),
  );

  const { valid, flagged } = validateAttendanceEntries(entries, knownStudentIds, existingKeys);
  const now = new Date().toISOString();
  valid.forEach((entry) => {
    appendObjectRow(sheet, headers, {
      Timestamp: now,
      ...entry,
      _status: "ok",
      _flagReason: "",
      _processedAt: now,
    });
  });
  return { written: valid.length, flagged };
}

function readExistingKeys(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  keyOf: (row: unknown[]) => string,
): Set<string> {
  const values = sheet.getDataRange().getValues();
  const keys = new Set<string>();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (row.every((c) => c === "" || c === null)) continue;
    keys.add(keyOf(row));
  }
  return keys;
}
