import { getMasterRegistrySpreadsheetId } from "./config";
import { appendObjectRow, getHeaders, readRowsAsObjects, updateMatchingRow } from "./sheetAccess";
import type { SchoolRow, StaffUser } from "./types";

export const SCHOOLS_SHEET = "Schools";
export const STAFF_SHEET = "Staff";
export const STUDENT_ACCOUNTS_SHEET = "StudentAccounts";

export const SCHOOLS_HEADERS = [
  "schoolId",
  "name",
  "district",
  "adminEmail",
  "status",
  "spreadsheetId",
  "scoresFormId",
  "attendanceFormId",
  "createdAt",
];

export const STAFF_HEADERS = [
  "email",
  "schoolId",
  "role",
  "name",
  "username",
  "passwordHash",
  "passwordSalt",
  "mustChangePassword",
  "classes",
];

/** Central index so a bare username (no known school) can be resolved to a
 * school + studentId — student credentials themselves live in that school's
 * own Students sheet, not here. */
export const STUDENT_ACCOUNTS_HEADERS = ["username", "schoolId", "studentId"];

export interface StudentAccountIndexRow {
  username: string;
  schoolId: string;
  studentId: string;
}

function openMasterRegistry(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.openById(getMasterRegistrySpreadsheetId());
}

export function listSchools(): SchoolRow[] {
  const sheet = openMasterRegistry().getSheetByName(SCHOOLS_SHEET);
  if (!sheet) return [];
  return readRowsAsObjects<SchoolRow>(sheet);
}

export function findSchoolById(schoolId: string): SchoolRow | undefined {
  return listSchools().find((s) => s.schoolId === schoolId);
}

export function addSchoolRow(row: SchoolRow): void {
  const sheet = openMasterRegistry().getSheetByName(SCHOOLS_SHEET);
  if (!sheet)
    throw new Error(
      `Master registry is missing the "${SCHOOLS_SHEET}" tab. Run bootstrap() first.`,
    );
  appendObjectRow(sheet, getHeaders(sheet), row as unknown as Record<string, unknown>);
}

/** Network-admin only: suspend or reactivate a school. Does not itself
 * check who's calling — see network.ts / api.ts for the role gate. */
export function setSchoolStatus(schoolId: string, status: "active" | "suspended"): void {
  const sheet = openMasterRegistry().getSheetByName(SCHOOLS_SHEET);
  if (!sheet)
    throw new Error(
      `Master registry is missing the "${SCHOOLS_SHEET}" tab. Run bootstrap() first.`,
    );
  const updated = updateMatchingRow(sheet, "schoolId", schoolId, { status });
  if (!updated) throw new Error(`Unknown school "${schoolId}".`);
}

export function listStaff(): StaffUser[] {
  const sheet = openMasterRegistry().getSheetByName(STAFF_SHEET);
  if (!sheet) return [];
  return readRowsAsObjects<StaffUser>(sheet);
}

export function findStaffByUsername(username: string): StaffUser | undefined {
  const normalized = username.trim().toLowerCase();
  return listStaff().find((s) => s.username.trim().toLowerCase() === normalized);
}

/** Staff commonly type their email instead of the username they were
 * assigned — this lets login accept either. There's no equivalent for
 * students: their email lives per-school, not in a central index, so a
 * cheap lookup isn't available the same way. */
export function findStaffByEmail(email: string): StaffUser | undefined {
  const normalized = email.trim().toLowerCase();
  return listStaff().find((s) => s.email.trim().toLowerCase() === normalized);
}

export function addStaffRow(user: StaffUser): void {
  const sheet = openMasterRegistry().getSheetByName(STAFF_SHEET);
  if (!sheet)
    throw new Error(`Master registry is missing the "${STAFF_SHEET}" tab. Run bootstrap() first.`);
  appendObjectRow(sheet, getHeaders(sheet), user as unknown as Record<string, unknown>);
}

/** Returns whether a matching staff row was found and updated. */
export function updateStaffCredentials(
  username: string,
  passwordHash: string,
  passwordSalt: string,
): boolean {
  const sheet = openMasterRegistry().getSheetByName(STAFF_SHEET);
  if (!sheet) return false;
  return updateMatchingRow(sheet, "username", username, {
    passwordHash,
    passwordSalt,
    mustChangePassword: false,
  });
}

export function listStudentAccounts(): StudentAccountIndexRow[] {
  const sheet = openMasterRegistry().getSheetByName(STUDENT_ACCOUNTS_SHEET);
  if (!sheet) return [];
  return readRowsAsObjects<StudentAccountIndexRow>(sheet);
}

export function findStudentAccountByUsername(username: string): StudentAccountIndexRow | undefined {
  const normalized = username.trim().toLowerCase();
  return listStudentAccounts().find((s) => s.username.trim().toLowerCase() === normalized);
}

export function addStudentAccountRow(row: StudentAccountIndexRow): void {
  const sheet = openMasterRegistry().getSheetByName(STUDENT_ACCOUNTS_SHEET);
  if (!sheet) {
    throw new Error(
      `Master registry is missing the "${STUDENT_ACCOUNTS_SHEET}" tab. Run bootstrap() first.`,
    );
  }
  appendObjectRow(sheet, getHeaders(sheet), row as unknown as Record<string, unknown>);
}
