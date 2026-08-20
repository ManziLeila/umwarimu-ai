// One-time repair for a real bug: linkFormResponses (see sheetAccess.ts) had
// a race where it sometimes failed to detect/rename the response sheet it
// had just created, leaving it as Google's auto-generated "Form Responses
// N" instead of "Scores"/"Attendance". Since every reader looks the sheet
// up by that exact name, this silently zeroed out ingestion/dashboards for
// every already-onboarded school (and the shared template they're copied
// from) without ever throwing. Safe to run more than once.

import {
  getTemplateAttendanceFormId,
  getTemplateScoresFormId,
  getTemplateSpreadsheetId,
} from "./config";
import { listSchools } from "./registry";
import { appendObjectRow, ensureStatusColumns, getHeaders } from "./sheetAccess";
import type { SchoolRow } from "./types";

const SCORE_SIGNATURE = ["studentId", "subject", "date", "score", "maxScore"];
const ATTENDANCE_SIGNATURE = ["studentId", "date", "attendanceStatus"];

function matchesSignature(headers: string[], signature: string[]): boolean {
  return signature.every((h) => headers.includes(h));
}

function linkedFormId(sheet: GoogleAppsScript.Spreadsheet.Sheet): string | undefined {
  const url = sheet.getFormUrl();
  if (!url) return undefined;
  try {
    return FormApp.openByUrl(url).getId();
  } catch {
    return undefined;
  }
}

function repairSheetKind(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  desiredName: string,
  signature: string[],
  ownFormId: string,
): string {
  const existing = ss.getSheetByName(desiredName);
  if (existing) {
    ensureStatusColumns(existing);
    return `${desiredName}: OK.`;
  }

  const candidates = ss
    .getSheets()
    .filter((s) => s.getName().startsWith("Form Responses"))
    .filter((s) => matchesSignature(getHeaders(s), signature));

  if (candidates.length === 0) {
    return `${desiredName}: no orphaned response sheet found — nothing to repair.`;
  }

  // Prefer whichever candidate is actually linked to *this* spreadsheet's
  // own form — the other candidate(s) are ghosts left over from copying a
  // spreadsheet that already had a (mis-linked) sheet on it. Falls back to
  // "most rows" if none match (e.g. repairing the template itself, where
  // there's only ever one form to begin with).
  candidates.sort((a, b) => {
    const aOwn = linkedFormId(a) === ownFormId ? 1 : 0;
    const bOwn = linkedFormId(b) === ownFormId ? 1 : 0;
    if (aOwn !== bOwn) return bOwn - aOwn;
    return b.getLastRow() - a.getLastRow();
  });
  const [primary, ...extras] = candidates;
  const primaryHeaders = getHeaders(primary);

  let mergedRows = 0;
  extras.forEach((extra) => {
    const extraHeaders = getHeaders(extra);
    const rows = extra.getDataRange().getValues().slice(1);
    rows.forEach((row) => {
      const obj: Record<string, unknown> = {};
      extraHeaders.forEach((h, i) => (obj[h] = row[i]));
      appendObjectRow(primary, primaryHeaders, obj);
      mergedRows += 1;
    });

    // A sheet copied along with the spreadsheet (via Drive's makeCopy) can
    // still carry a link to the *original* form it was copied from — Apps
    // Script refuses to delete a form-linked sheet, so unlink it first.
    const formUrl = extra.getFormUrl();
    if (formUrl) FormApp.openByUrl(formUrl).removeDestination();

    ss.deleteSheet(extra);
  });

  primary.setName(desiredName);
  primary.setFrozenRows(1);
  ensureStatusColumns(primary);
  return `${desiredName}: repaired (renamed 1 sheet, merged ${extras.length} duplicate(s), ${mergedRows} row(s) carried over).`;
}

function repairSpreadsheet(
  spreadsheetId: string,
  scoresFormId: string,
  attendanceFormId: string,
): string[] {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  return [
    repairSheetKind(ss, "Scores", SCORE_SIGNATURE, scoresFormId),
    repairSheetKind(ss, "Attendance", ATTENDANCE_SIGNATURE, attendanceFormId),
  ];
}

export function repairAllSchoolSheets(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  result["__template__"] = repairSpreadsheet(
    getTemplateSpreadsheetId(),
    getTemplateScoresFormId(),
    getTemplateAttendanceFormId(),
  );
  for (const school of listSchools() as SchoolRow[]) {
    try {
      result[school.schoolId] = repairSpreadsheet(
        school.spreadsheetId,
        school.scoresFormId,
        school.attendanceFormId,
      );
    } catch (err) {
      result[school.schoolId] = [`ERROR: ${err instanceof Error ? err.message : String(err)}`];
    }
  }
  return result;
}
