// Thin server-only client for the Apps Script Web App JSON API. Never
// imported from a client component — every function here calls the Apps
// Script backend with a shared secret, and that secret must never reach the
// browser. See apps-script/src/api.ts for the endpoint this talks to.

export type Role = "teacher" | "admin" | "network-admin" | "student";

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
  role: Role;
  classes: string[];
  studentId?: string;
}

export type StudentStatus = "on-track" | "improving" | "support" | "risk";

export interface StudentSummary {
  id: string;
  name: string;
  className: string;
  overall: number;
  attendance: number;
  trend: "up" | "down" | "flat";
  status: StudentStatus;
  weakest: string;
}

export interface StudentDetail extends StudentSummary {
  subjects: Array<{ subject: string; score: number }>;
  assessments: Array<{ name: string; date: string; score: number }>;
  notes: Array<{ author: string; date: string; text: string }>;
  recommendations: string[];
  weakSubjects: string[];
}

export interface TrendPoint {
  period: string;
  [subject: string]: string | number;
}

export interface DashboardData {
  metrics: {
    students: number;
    avgScore: number;
    attendance: number;
    needSupport: number;
    avgDelta: number;
    attendanceDelta: number;
  };
  performanceTrend: TrendPoint[];
  supportStatus: Array<{ key: StudentStatus; label: string; count: number }>;
  studentsToCheckIn: StudentSummary[];
  recentActivity: Array<{ text: string; time: string }>;
  insight: { body: string; bullet: string };
  subjects: string[];
}

export interface AnalyticsData {
  avgScore: number;
  avgDelta: number;
  highestSubject: string;
  lowestSubject: string;
  attendance: number;
  performanceTrend: TrendPoint[];
  subjectAverages: Array<{ subject: string; average: number }>;
  attendanceByWeek: Array<{ week: string; attendance: number }>;
  attendanceVsPerformance: Array<{
    studentId: string;
    name: string;
    attendance: number;
    avgScore: number;
  }>;
  subjects: string[];
}

interface AppsScriptResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function callAppsScript<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  const url = process.env["APPS_SCRIPT_WEB_APP_URL"];
  const apiKey = process.env["APPS_SCRIPT_API_KEY"];
  if (!url || !apiKey) {
    throw new Error(
      "The Apps Script backend is not configured (APPS_SCRIPT_WEB_APP_URL / APPS_SCRIPT_API_KEY).",
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ apiKey, action, params }),
  });

  if (!res.ok) {
    throw new Error(`Apps Script backend returned HTTP ${res.status}.`);
  }

  const body = (await res.json()) as AppsScriptResponse<T>;
  if (!body.ok) {
    throw new Error(body.error ?? "Apps Script backend request failed.");
  }
  return body.data as T;
}

// --- Auth / accounts ---

export function findAccount(username: string): Promise<AccountCredentials> {
  return callAppsScript<AccountCredentials>("findAccount", { username });
}

export function sendOtpEmail(email: string, code: string): Promise<void> {
  return callAppsScript<void>("sendOtpEmail", { email, code });
}

export interface CreateTeacherAccountInput {
  schoolId: string;
  email: string;
  name: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  tempPassword: string;
  classes: string[];
  role: "teacher" | "admin";
}

export interface CreateAccountResult {
  emailSent: boolean;
  emailError?: string;
}

export function createTeacherAccount(
  input: CreateTeacherAccountInput,
): Promise<CreateAccountResult> {
  return callAppsScript<CreateAccountResult>("createTeacherAccount", { ...input });
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
  tempPassword: string;
}

export function createStudentAccount(
  input: CreateStudentAccountInput,
): Promise<CreateAccountResult> {
  return callAppsScript<CreateAccountResult>("createStudentAccount", { ...input });
}

export interface StaffListItem {
  email: string;
  name: string;
  username: string;
  role: Role;
  classes: string[];
  mustChangePassword: boolean;
}

export function listStaffForSchool(schoolId: string): Promise<StaffListItem[]> {
  return callAppsScript<StaffListItem[]>("listStaffForSchool", { schoolId });
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

export function listStudentsForSchool(schoolId: string): Promise<StudentListItem[]> {
  return callAppsScript<StudentListItem[]>("listStudentsForSchool", { schoolId });
}

export interface OnboardSchoolInput {
  schoolId: string;
  name: string;
  district: string;
  adminEmail: string;
  adminName: string;
  adminUsername: string;
  adminPasswordHash: string;
  adminPasswordSalt: string;
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

export function onboardSchool(input: OnboardSchoolInput): Promise<OnboardSchoolResult> {
  return callAppsScript<OnboardSchoolResult>("onboardSchool", { ...input });
}

// --- Network-admin (platform-wide) oversight ---

export interface SchoolWithStats {
  schoolId: string;
  name: string;
  district: string;
  adminEmail: string;
  status: "active" | "suspended";
  spreadsheetId: string;
  scoresFormId: string;
  attendanceFormId: string;
  createdAt: string;
  studentCount: number;
  staffCount: number;
}

export function listSchoolsWithStats(): Promise<SchoolWithStats[]> {
  return callAppsScript<SchoolWithStats[]>("listSchoolsWithStats", {});
}

export function setSchoolStatus(schoolId: string, status: "active" | "suspended"): Promise<void> {
  return callAppsScript<void>("setSchoolStatus", { schoolId, status });
}

export function updatePassword(
  kind: "staff" | "student",
  username: string,
  passwordHash: string,
  passwordSalt: string,
): Promise<void> {
  return callAppsScript<void>("updatePassword", { kind, username, passwordHash, passwordSalt });
}

// --- Dashboard / students / analytics reads ---
// `classes` scopes results to a teacher's own class(es); pass [] (or omit)
// for an admin/network-admin view of the whole school.

export function getDashboard(schoolId: string, classes: string[] = []): Promise<DashboardData> {
  return callAppsScript<DashboardData>("getDashboard", { schoolId, classes });
}

export function getStudents(schoolId: string, classes: string[] = []): Promise<StudentSummary[]> {
  return callAppsScript<StudentSummary[]>("getStudents", { schoolId, classes });
}

export function getStudent(
  schoolId: string,
  studentId: string,
  classes: string[] = [],
): Promise<StudentDetail> {
  return callAppsScript<StudentDetail>("getStudent", { schoolId, studentId, classes });
}

export function getAnalytics(schoolId: string, classes: string[] = []): Promise<AnalyticsData> {
  return callAppsScript<AnalyticsData>("getAnalytics", { schoolId, classes });
}

// --- In-app marks/attendance entry ---
// `classes` scopes which students an entry is allowed to target — pass a
// teacher's own class(es), or [] for an admin entering on behalf of anyone.

export interface ScoreEntryInput {
  studentId: string;
  subject: string;
  date: string;
  score: number;
  maxScore: number;
}

export interface AttendanceEntryInput {
  studentId: string;
  date: string;
  attendanceStatus: "present" | "absent" | "late";
}

export interface SubmitEntryResult<T> {
  written: number;
  flagged: Array<{ entry: T; reason: string }>;
}

export function submitScores(
  schoolId: string,
  entries: ScoreEntryInput[],
  classes: string[] = [],
): Promise<SubmitEntryResult<ScoreEntryInput>> {
  return callAppsScript<SubmitEntryResult<ScoreEntryInput>>("submitScores", {
    schoolId,
    entries,
    classes,
  });
}

export function submitAttendance(
  schoolId: string,
  entries: AttendanceEntryInput[],
  classes: string[] = [],
): Promise<SubmitEntryResult<AttendanceEntryInput>> {
  return callAppsScript<SubmitEntryResult<AttendanceEntryInput>>("submitAttendance", {
    schoolId,
    entries,
    classes,
  });
}
