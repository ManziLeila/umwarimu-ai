import {
  addStaffRow,
  addStudentAccountRow,
  findSchoolById,
  findStaffByEmail,
  findStaffByUsername,
  findStudentAccountByUsername,
  listStaff,
  updateStaffCredentials,
} from "./registry";
import { readActiveStudents } from "./schoolData";
import { appendObjectRow, getHeaders, readRowsAsObjects, updateMatchingRow } from "./sheetAccess";
import type { AccountCredentials, Role, Student } from "./types";

export function parseClasses(classes: string): string[] {
  return classes
    ? classes
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];
}

export interface CreateTeacherAccountInput {
  schoolId: string;
  email: string;
  name: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  /** Plaintext, used only to email the new account holder once — never stored. */
  tempPassword: string;
  classes: string[];
  role: "teacher" | "admin";
}

export interface CreateAccountResult {
  emailSent: boolean;
  emailError?: string;
}

/** Admin-only: registers a new teacher/admin login and emails them their
 * username + temp password once. Node computes the hash (and the temp
 * password) — this function only ever persists the hash.
 *
 * The account row is written regardless of whether the email succeeds —
 * otherwise a mail hiccup (quota, a bad manifest scope, whatever) would
 * make it look like creation failed while quietly leaving nothing behind
 * to retry. Callers must check `emailSent` and show the temp password
 * on-screen as a fallback when it's false, since a failed send here means
 * nobody else received it either. */
export function createTeacherAccount(input: CreateTeacherAccountInput): CreateAccountResult {
  const school = findSchoolById(input.schoolId);
  if (!school) throw new Error(`Unknown school "${input.schoolId}".`);
  if (findStaffByUsername(input.username))
    throw new Error(`Username "${input.username}" is already taken.`);

  addStaffRow({
    email: input.email,
    schoolId: input.schoolId,
    role: input.role,
    name: input.name,
    username: input.username,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    mustChangePassword: true,
    classes: input.classes.join(","),
  });

  // Share the school spreadsheet directly too, matching the "inspectable by
  // non-technical staff" goal from the original architecture decision.
  DriveApp.getFileById(school.spreadsheetId).addEditor(input.email);

  return trySendNewAccountEmail(input.email, input.name, input.username, input.tempPassword);
}

export interface CreateStudentAccountInput {
  schoolId: string;
  studentId: string;
  name: string;
  className: string;
  guardianName: string;
  guardianEmail: string;
  studentEmail: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  /** Plaintext, used only to email the new account holder once — never stored. */
  tempPassword: string;
}

export function createStudentAccount(input: CreateStudentAccountInput): CreateAccountResult {
  const school = findSchoolById(input.schoolId);
  if (!school) throw new Error(`Unknown school "${input.schoolId}".`);
  if (findStudentAccountByUsername(input.username))
    throw new Error(`Username "${input.username}" is already taken.`);

  const ss = SpreadsheetApp.openById(school.spreadsheetId);
  const sheet = ss.getSheetByName("Students");
  if (!sheet) throw new Error(`School "${input.schoolId}" has no Students sheet.`);

  const existing = readRowsAsObjects<Student>(sheet).find((s) => s.studentId === input.studentId);
  if (existing) throw new Error(`Student ID "${input.studentId}" already exists.`);

  const row: Student = {
    studentId: input.studentId,
    name: input.name,
    className: input.className,
    guardianName: input.guardianName,
    guardianEmail: input.guardianEmail,
    status: "active",
    username: input.username,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    mustChangePassword: true,
    studentEmail: input.studentEmail,
  };
  appendObjectRow(sheet, getHeaders(sheet), row as unknown as Record<string, unknown>);
  addStudentAccountRow({
    username: input.username,
    schoolId: input.schoolId,
    studentId: input.studentId,
  });

  return trySendNewAccountEmail(input.studentEmail, input.name, input.username, input.tempPassword);
}

/** Resolves a bare username to full login/session data, checking staff
 * first, then the student index. Undefined if no account matches. */
export function findAccountByUsername(username: string): AccountCredentials | undefined {
  const staff = findStaffByUsername(username) ?? findStaffByEmail(username);
  if (staff) {
    const school = staff.schoolId ? findSchoolById(staff.schoolId) : undefined;
    return {
      kind: "staff",
      username: staff.username,
      passwordHash: staff.passwordHash,
      passwordSalt: staff.passwordSalt,
      mustChangePassword: staff.mustChangePassword,
      email: staff.email,
      name: staff.name,
      schoolId: staff.schoolId,
      schoolName: school?.name ?? "",
      role: staff.role,
      classes: parseClasses(staff.classes),
    };
  }

  const studentIndex = findStudentAccountByUsername(username);
  if (!studentIndex) return undefined;

  const school = findSchoolById(studentIndex.schoolId);
  if (!school) return undefined;

  const ss = SpreadsheetApp.openById(school.spreadsheetId);
  const sheet = ss.getSheetByName("Students");
  const student = sheet
    ? readRowsAsObjects<Student>(sheet).find((s) => s.studentId === studentIndex.studentId)
    : undefined;
  if (!student?.username || !student.passwordHash || !student.passwordSalt) return undefined;

  return {
    kind: "student",
    username: student.username,
    passwordHash: student.passwordHash,
    passwordSalt: student.passwordSalt,
    mustChangePassword: Boolean(student.mustChangePassword),
    email: student.studentEmail ?? "",
    name: student.name,
    schoolId: studentIndex.schoolId,
    schoolName: school.name,
    role: "student",
    classes: [student.className],
    studentId: student.studentId,
  };
}

export interface UpdatePasswordInput {
  kind: "staff" | "student";
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

/** Used both for the forced first-login password change and any later
 * voluntary change — clears mustChangePassword in the same write. */
export function updateAccountPassword(input: UpdatePasswordInput): void {
  if (input.kind === "staff") {
    const updated = updateStaffCredentials(input.username, input.passwordHash, input.passwordSalt);
    if (!updated) throw new Error(`No staff account found for username "${input.username}".`);
    return;
  }

  const studentIndex = findStudentAccountByUsername(input.username);
  if (!studentIndex) throw new Error(`No student account found for username "${input.username}".`);
  const school = findSchoolById(studentIndex.schoolId);
  if (!school) throw new Error(`Unknown school "${studentIndex.schoolId}".`);

  const sheet = SpreadsheetApp.openById(school.spreadsheetId).getSheetByName("Students");
  if (!sheet) throw new Error(`School "${studentIndex.schoolId}" has no Students sheet.`);

  const updated = updateMatchingRow(sheet, "username", input.username, {
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    mustChangePassword: false,
  });
  if (!updated) throw new Error(`No student row found for username "${input.username}".`);
}

export interface StaffListItem {
  email: string;
  name: string;
  username: string;
  role: Role;
  classes: string[];
  mustChangePassword: boolean;
}

/** Admin-facing roster of their own school's staff — never includes
 * passwordHash/passwordSalt, unlike the internal StaffUser rows. */
export function listStaffForSchool(schoolId: string): StaffListItem[] {
  return listStaff()
    .filter((s) => s.schoolId === schoolId)
    .map((s) => ({
      email: s.email,
      name: s.name,
      username: s.username,
      role: s.role,
      classes: parseClasses(s.classes),
      mustChangePassword: s.mustChangePassword,
    }));
}

export interface StudentListItem {
  studentId: string;
  name: string;
  className: string;
  guardianName: string;
  guardianEmail: string;
  status: "active" | "inactive";
  hasAccount: boolean;
}

/** Admin-facing roster of their own school's students — never includes
 * passwordHash/passwordSalt. */
export function listStudentsForSchool(schoolId: string): StudentListItem[] {
  const school = findSchoolById(schoolId);
  if (!school) throw new Error(`Unknown school "${schoolId}".`);

  const ss = SpreadsheetApp.openById(school.spreadsheetId);
  return readActiveStudents(ss).map((s) => ({
    studentId: s.studentId,
    name: s.name,
    className: s.className,
    guardianName: s.guardianName,
    guardianEmail: s.guardianEmail,
    status: s.status,
    hasAccount: Boolean(s.username),
  }));
}

/** Sends a short-lived sign-in code to a real inbox. Node signs/verifies the
 * code itself (see src/lib/auth.server.ts) — Apps Script only ever sends the
 * email, no OTP state lives here. */
export function sendOtpEmail(email: string, code: string): void {
  MailApp.sendEmail({
    to: email,
    subject: "Your Umwarimu AI sign-in code",
    body: `Your sign-in code is ${code}. It expires in a few minutes. If you didn't request this, you can ignore this email.`,
  });
}

export function trySendNewAccountEmail(
  email: string,
  name: string,
  username: string,
  tempPassword: string,
): CreateAccountResult {
  try {
    MailApp.sendEmail({
      to: email,
      subject: "Your Umwarimu AI account",
      body: [
        `Hi ${name},`,
        "",
        "An account has been created for you on Umwarimu AI.",
        `Username: ${username}`,
        `Temporary password: ${tempPassword}`,
        "",
        "You'll be asked to choose a new password the first time you sign in.",
      ].join("\n"),
    });
    return { emailSent: true };
  } catch (err) {
    return { emailSent: false, emailError: err instanceof Error ? err.message : String(err) };
  }
}
