// Pure logic only — no SpreadsheetApp/DriveApp calls in this file, so it can
// run under Jest exactly as written, with no Apps Script runtime involved.

import type { ScoreEntry, AttendanceEntry } from "./types";

export interface ValidationResult<T> {
  valid: T[];
  flagged: Array<{ entry: T; reason: string }>;
}

export function scoreKey(entry: Pick<ScoreEntry, "studentId" | "subject" | "date">): string {
  return `${entry.studentId}|${entry.subject}|${entry.date}`;
}

export function attendanceKey(entry: Pick<AttendanceEntry, "studentId" | "date">): string {
  return `${entry.studentId}|${entry.date}`;
}

export function validateScoreEntries(
  entries: ScoreEntry[],
  knownStudentIds: ReadonlySet<string>,
  existingKeys: ReadonlySet<string>,
): ValidationResult<ScoreEntry> {
  const valid: ScoreEntry[] = [];
  const flagged: Array<{ entry: ScoreEntry; reason: string }> = [];
  const seenInBatch = new Set<string>();

  for (const entry of entries) {
    const key = scoreKey(entry);
    const reasons: string[] = [];

    if (!knownStudentIds.has(entry.studentId)) {
      reasons.push(`Unknown student ID "${entry.studentId}"`);
    }
    if (!(entry.maxScore > 0)) {
      reasons.push("Max score must be greater than 0");
    }
    if (entry.score < 0) {
      reasons.push("Score cannot be negative");
    }
    if (entry.maxScore > 0 && entry.score > entry.maxScore) {
      reasons.push(`Score (${entry.score}) exceeds max score (${entry.maxScore})`);
    }
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      reasons.push(
        `Duplicate entry for student ${entry.studentId}, ${entry.subject}, ${entry.date}`,
      );
    }

    if (reasons.length > 0) {
      flagged.push({ entry, reason: reasons.join("; ") });
    } else {
      valid.push(entry);
      seenInBatch.add(key);
    }
  }

  return { valid, flagged };
}

export function validateAttendanceEntries(
  entries: AttendanceEntry[],
  knownStudentIds: ReadonlySet<string>,
  existingKeys: ReadonlySet<string>,
): ValidationResult<AttendanceEntry> {
  const valid: AttendanceEntry[] = [];
  const flagged: Array<{ entry: AttendanceEntry; reason: string }> = [];
  const seenInBatch = new Set<string>();
  const allowedStatuses = new Set(["present", "absent", "late"]);

  for (const entry of entries) {
    const key = attendanceKey(entry);
    const reasons: string[] = [];

    if (!knownStudentIds.has(entry.studentId)) {
      reasons.push(`Unknown student ID "${entry.studentId}"`);
    }
    if (!allowedStatuses.has(entry.attendanceStatus)) {
      reasons.push(`Unrecognized attendance status "${entry.attendanceStatus}"`);
    }
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      reasons.push(`Duplicate attendance entry for student ${entry.studentId} on ${entry.date}`);
    }

    if (reasons.length > 0) {
      flagged.push({ entry, reason: reasons.join("; ") });
    } else {
      valid.push(entry);
      seenInBatch.add(key);
    }
  }

  return { valid, flagged };
}
