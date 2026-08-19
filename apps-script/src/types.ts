export type Role = "teacher" | "admin" | "network-admin";

export interface StaffUser {
  email: string;
  schoolId: string;
  role: Role;
  name: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword: boolean;
  /** Comma-separated class names this teacher owns. Empty for admin/network-admin — they aren't scoped to a class. */
  classes: string;
}

/** What Node needs to run login step 1 (verify password) and step 2 (know who to
 * establish a session for), for either a staff or a student account. Apps Script
 * never sees a plaintext password — only ever stores/returns the hash + salt. */
export interface AccountCredentials {
  kind: "staff" | "student";
  username: string;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword: boolean;
  email: string;
  name: string;
  schoolId: string;
  schoolName: string;
  role: Role | "student";
  classes: string[];
  studentId?: string;
}

export interface SchoolRow {
  schoolId: string;
  name: string;
  district: string;
  adminEmail: string;
  status: "active" | "suspended";
  spreadsheetId: string;
  scoresFormId: string;
  attendanceFormId: string;
  createdAt: string;
}

export interface Student {
  studentId: string;
  name: string;
  className: string;
  guardianName: string;
  guardianEmail: string;
  status: "active" | "inactive";
  // A student doesn't necessarily have a portal login — these are only
  // present once an admin has created one via createStudentAccount.
  username?: string;
  passwordHash?: string;
  passwordSalt?: string;
  mustChangePassword?: boolean;
  /** The student's own email — distinct from guardianEmail. OTPs go here; at-risk alerts still go to the guardian. */
  studentEmail?: string;
}

export type EntryStatus = "ok" | "flagged";

export interface ScoreEntry {
  studentId: string;
  subject: string;
  date: string; // ISO yyyy-MM-dd
  score: number;
  maxScore: number;
}

export interface AttendanceEntry {
  studentId: string;
  date: string; // ISO yyyy-MM-dd
  attendanceStatus: "present" | "absent" | "late";
}

export interface SchoolConfig {
  lowScorePct: number;
  attendanceThresholdPct: number;
  rollingPeriodDays: number;
}

export interface DataIssueRow {
  detectedAt: string;
  sheet: "Scores" | "Attendance";
  studentId: string;
  reason: string;
  rawRow: string;
}

export interface AlertLogRow {
  studentId: string;
  reason: string;
  subjects: string;
  dateSent: string;
  recipients: string;
  alertId: string;
}
