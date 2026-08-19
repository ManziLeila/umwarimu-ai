// Thin, generic wrappers around SpreadsheetApp/FormApp. Not unit-tested
// directly (there is no Apps Script runtime under Jest) — kept deliberately
// small so the untested surface area stays small too.

export function formatSheetDate(value: unknown): string {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

export function getHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((h) => String(h).trim());
}

export function readRowsAsObjects<T>(sheet: GoogleAppsScript.Spreadsheet.Sheet): T[] {
  const range = sheet.getDataRange().getValues();
  if (range.length < 2) return [];
  const headers = range[0].map((h) => String(h).trim());
  return range
    .slice(1)
    .filter((row) => row.some((cell) => cell !== "" && cell !== null))
    .map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj as T;
    });
}

export function appendObjectRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headers: string[],
  obj: Record<string, unknown>,
): void {
  sheet.appendRow(headers.map((h) => obj[h] ?? ""));
}

export function getOrCreateSheet(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string,
  headers: string[],
): GoogleAppsScript.Spreadsheet.Sheet {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Appends any headers missing from an existing sheet, without touching
 * existing columns/data — used to migrate already-live spreadsheets (e.g.
 * a school onboarded before a schema change) rather than requiring a
 * destructive re-bootstrap. */
export function ensureHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: string[]): void {
  const existing = getHeaders(sheet);
  const missing = headers.filter((h) => !existing.includes(h));
  if (missing.length === 0) return;
  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
}

/** Finds the row where `matchColumn` equals `matchValue` and updates only
 * the given fields in place — everything else on that row is untouched.
 * Returns whether a matching row was found. Used for things like changing
 * a stored password hash without disturbing the rest of the account row. */
export function updateMatchingRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  matchColumn: string,
  matchValue: string,
  updates: Record<string, unknown>,
): boolean {
  const headers = getHeaders(sheet);
  const matchCol = headers.indexOf(matchColumn);
  if (matchCol === -1) return false;

  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][matchCol]) === matchValue) {
      Object.entries(updates).forEach(([key, value]) => {
        const col = headers.indexOf(key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (col !== -1) sheet.getRange(r + 1, col + 1).setValue(value as any);
      });
      return true;
    }
  }
  return false;
}

export function applyListValidation(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerName: string,
  values: string[],
): void {
  const headers = getHeaders(sheet);
  const col = headers.indexOf(headerName) + 1;
  if (col === 0) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, 999, 1).setDataValidation(rule);
}

/**
 * Points a Form's responses at `spreadsheet`, renames the auto-created
 * response sheet to `desiredSheetName`, and appends the system columns
 * (_status/_flagReason/_processedAt) used by the ingestion pipeline.
 * Idempotent: safe to call again on an already-linked form.
 */
export function linkFormResponses(
  form: GoogleAppsScript.Forms.Form,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  desiredSheetName: string,
): GoogleAppsScript.Spreadsheet.Sheet | undefined {
  const before = new Set(spreadsheet.getSheets().map((s) => s.getSheetId()));
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  const created = spreadsheet.getSheets().find((s) => !before.has(s.getSheetId()));
  const sheet = created ?? spreadsheet.getSheetByName(desiredSheetName);
  if (!sheet) return undefined;

  sheet.setName(desiredSheetName);
  sheet.setFrozenRows(1);

  const headers = getHeaders(sheet);
  if (!headers.includes("_status")) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1, 1, 3).setValues([["_status", "_flagReason", "_processedAt"]]);
  }
  return sheet;
}
