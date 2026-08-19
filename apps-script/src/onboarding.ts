import { trySendNewAccountEmail } from "./accounts";
import {
  getTemplateAttendanceFormId,
  getTemplateScoresFormId,
  getTemplateSpreadsheetId,
} from "./config";
import { addSchoolRow, addStaffRow, findSchoolById } from "./registry";
import { linkFormResponses } from "./sheetAccess";
import type { SchoolRow } from "./types";

export interface OnboardSchoolInput {
  schoolId: string;
  name: string;
  district: string;
  adminEmail: string;
  adminName: string;
  /** Pre-hashed by the caller (Node) — Apps Script never sees a plaintext
   * password. See createTeacherAccount/createStudentAccount for how
   * additional staff/student accounts get added after onboarding. */
  adminUsername: string;
  adminPasswordHash: string;
  adminPasswordSalt: string;
  /** Plaintext, used only to email the new admin once — never stored. */
  adminTempPassword: string;
}

export interface OnboardSchoolResult {
  schoolId: string;
  spreadsheetUrl: string;
  scoresFormUrl: string;
  attendanceFormUrl: string;
  emailSent: boolean;
  emailError?: string;
}

/**
 * Repeatable, scriptable onboarding: clone the template spreadsheet + the
 * two template forms, point the forms' responses at the new spreadsheet,
 * share everything with the school admin, register the school in the
 * master registry, and create the admin's own login. No manual copy-pasting.
 */
export function onboardSchool(input: OnboardSchoolInput): OnboardSchoolResult {
  if (findSchoolById(input.schoolId)) {
    throw new Error(`School ID "${input.schoolId}" is already registered.`);
  }

  const spreadsheetCopy = DriveApp.getFileById(getTemplateSpreadsheetId()).makeCopy(
    `${input.name} — Umwarimu AI Data`,
  );
  const spreadsheet = SpreadsheetApp.openById(spreadsheetCopy.getId());

  const scoresFormCopy = DriveApp.getFileById(getTemplateScoresFormId()).makeCopy(
    `${input.name} — Scores Form`,
  );
  const attendanceFormCopy = DriveApp.getFileById(getTemplateAttendanceFormId()).makeCopy(
    `${input.name} — Attendance Form`,
  );

  const scoresForm = FormApp.openById(scoresFormCopy.getId());
  linkFormResponses(scoresForm, spreadsheet, "Scores");

  const attendanceForm = FormApp.openById(attendanceFormCopy.getId());
  linkFormResponses(attendanceForm, spreadsheet, "Attendance");

  spreadsheetCopy.addEditor(input.adminEmail);
  scoresFormCopy.addEditor(input.adminEmail);
  attendanceFormCopy.addEditor(input.adminEmail);

  const schoolRow: SchoolRow = {
    schoolId: input.schoolId,
    name: input.name,
    district: input.district,
    adminEmail: input.adminEmail,
    status: "active",
    spreadsheetId: spreadsheet.getId(),
    scoresFormId: scoresForm.getId(),
    attendanceFormId: attendanceForm.getId(),
    createdAt: new Date().toISOString(),
  };
  addSchoolRow(schoolRow);

  addStaffRow({
    email: input.adminEmail,
    schoolId: input.schoolId,
    role: "admin",
    name: input.adminName,
    username: input.adminUsername,
    passwordHash: input.adminPasswordHash,
    passwordSalt: input.adminPasswordSalt,
    mustChangePassword: true,
    classes: "", // admin isn't scoped to a class — sees the whole school
  });

  const emailResult = trySendNewAccountEmail(
    input.adminEmail,
    input.adminName,
    input.adminUsername,
    input.adminTempPassword,
  );

  return {
    schoolId: input.schoolId,
    spreadsheetUrl: spreadsheetCopy.getUrl(),
    scoresFormUrl: scoresForm.getPublishedUrl(),
    attendanceFormUrl: attendanceForm.getPublishedUrl(),
    ...emailResult,
  };
}
