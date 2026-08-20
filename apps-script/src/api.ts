import {
  createStudentAccount,
  createTeacherAccount,
  findAccountByUsername,
  listStaffForSchool,
  listStudentsForSchool,
  sendOtpEmail,
  updateAccountPassword,
} from "./accounts";
import type {
  CreateStudentAccountInput,
  CreateTeacherAccountInput,
  UpdatePasswordInput,
} from "./accounts";
import { migrateAccountFields } from "./bootstrap";
import { getApiKey } from "./config";
import {
  buildAnalyticsData,
  buildDashboardData,
  buildStudentDetail,
  filterByClasses,
  summarizeStudent,
} from "./dashboardData";
import { submitAttendance, submitScores } from "./entry";
import { repairAllSchoolSheets } from "./repair";
import { onboardSchool } from "./onboarding";
import type { OnboardSchoolInput } from "./onboarding";
import { findSchoolById, listSchools } from "./registry";
import {
  readActiveStudents,
  readAlertLog,
  readSchoolConfig,
  readValidatedAttendance,
  readValidatedScores,
} from "./schoolData";
import type { AttendanceEntry, ScoreEntry } from "./types";

interface ApiRequest {
  apiKey: string;
  action: string;
  params?: Record<string, unknown>;
}

interface ApiResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// The web app is deployed "Execute as: Me" / "Anyone" (Apps Script web apps
// are unauthenticated public URLs at that setting) — apiKey is the real
// access gate on every request. The browser never calls this directly, only
// the Node backend, which owns all password/OTP verification itself; this
// API only ever stores/returns opaque credential data and sends emails.

export function handlePost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  return toJson(route(parseRequest(e)));
}

export function handleGet(_e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  return toJson({
    ok: true,
    data: { message: "Umwarimu AI Apps Script API. Use POST with a JSON body." },
  });
}

function parseRequest(e: GoogleAppsScript.Events.DoPost): ApiRequest {
  const raw = e.postData?.contents;
  if (!raw) throw new Error("Missing request body.");
  return JSON.parse(raw) as ApiRequest;
}

function route(req: ApiRequest): ApiResponse {
  try {
    if (req.apiKey !== getApiKey()) {
      return { ok: false, error: "Invalid API key." };
    }

    switch (req.action) {
      case "ping":
        return { ok: true, data: "pong" };

      case "findAccount": {
        const username = requireParam(req, "username");
        const account = findAccountByUsername(username);
        return account
          ? { ok: true, data: account }
          : { ok: false, error: `No account found for "${username}".` };
      }

      case "sendOtpEmail": {
        const email = requireParam(req, "email");
        const code = requireParam(req, "code");
        sendOtpEmail(email, code);
        return { ok: true, data: "sent" };
      }

      case "createTeacherAccount": {
        const input = req.params as unknown as CreateTeacherAccountInput;
        if (!input?.schoolId || !input?.email || !input?.username || !input?.passwordHash) {
          throw new Error("params.schoolId, email, username and passwordHash are required.");
        }
        return { ok: true, data: createTeacherAccount(input) };
      }

      case "createStudentAccount": {
        const input = req.params as unknown as CreateStudentAccountInput;
        if (!input?.schoolId || !input?.studentId || !input?.username || !input?.passwordHash) {
          throw new Error("params.schoolId, studentId, username and passwordHash are required.");
        }
        return { ok: true, data: createStudentAccount(input) };
      }

      case "updatePassword": {
        const input = req.params as unknown as UpdatePasswordInput;
        if (!input?.kind || !input?.username || !input?.passwordHash) {
          throw new Error("params.kind, username and passwordHash are required.");
        }
        updateAccountPassword(input);
        return { ok: true, data: "updated" };
      }

      case "listStaffForSchool":
        return { ok: true, data: listStaffForSchool(requireParam(req, "schoolId")) };

      case "listStudentsForSchool":
        return { ok: true, data: listStudentsForSchool(requireParam(req, "schoolId")) };

      case "migrateAccountFields":
        migrateAccountFields();
        return { ok: true, data: "migrated" };

      case "listSchools":
        return { ok: true, data: listSchools() };

      case "repairAllSchoolSheets":
        return { ok: true, data: repairAllSchoolSheets() };

      case "onboardSchool": {
        const input = req.params as unknown as OnboardSchoolInput;
        if (
          !input?.schoolId ||
          !input?.name ||
          !input?.adminEmail ||
          !input?.adminUsername ||
          !input?.adminPasswordHash ||
          !input?.adminTempPassword
        ) {
          throw new Error(
            "params.schoolId, name, adminEmail, adminUsername, adminPasswordHash and adminTempPassword are required.",
          );
        }
        return { ok: true, data: onboardSchool(input) };
      }

      case "getDashboard": {
        const ss = openSchool(requireParam(req, "schoolId"));
        const asOfDate = todayIso();
        const students = filterByClasses(readActiveStudents(ss), classesParam(req));
        const scores = readValidatedScores(ss);
        const attendance = readValidatedAttendance(ss);
        const alerts = readAlertLog(ss);
        const config = readSchoolConfig(ss);
        return {
          ok: true,
          data: buildDashboardData(students, scores, attendance, alerts, config, asOfDate),
        };
      }

      case "getStudents": {
        const ss = openSchool(requireParam(req, "schoolId"));
        const asOfDate = todayIso();
        const config = readSchoolConfig(ss);
        const scores = readValidatedScores(ss);
        const attendance = readValidatedAttendance(ss);
        const students = filterByClasses(readActiveStudents(ss), classesParam(req)).map((student) =>
          summarizeStudent(
            student,
            scores.filter((s) => s.studentId === student.studentId),
            attendance.filter((a) => a.studentId === student.studentId),
            config,
            asOfDate,
          ),
        );
        return { ok: true, data: students };
      }

      case "getStudent": {
        const ss = openSchool(requireParam(req, "schoolId"));
        const studentId = requireParam(req, "studentId");
        const asOfDate = todayIso();
        const config = readSchoolConfig(ss);
        const student = filterByClasses(readActiveStudents(ss), classesParam(req)).find(
          (s) => s.studentId === studentId,
        );
        if (!student)
          return { ok: false, error: `No active student "${studentId}" in this school.` };

        const scores = readValidatedScores(ss).filter((s) => s.studentId === studentId);
        const attendance = readValidatedAttendance(ss).filter((a) => a.studentId === studentId);
        return {
          ok: true,
          data: buildStudentDetail(student, scores, attendance, config, asOfDate),
        };
      }

      case "submitScores": {
        const ss = openSchool(requireParam(req, "schoolId"));
        const entries = req.params?.["entries"];
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new Error("params.entries must be a non-empty array.");
        }
        return {
          ok: true,
          data: submitScores(ss, entries as ScoreEntry[], classesParam(req)),
        };
      }

      case "submitAttendance": {
        const ss = openSchool(requireParam(req, "schoolId"));
        const entries = req.params?.["entries"];
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new Error("params.entries must be a non-empty array.");
        }
        return {
          ok: true,
          data: submitAttendance(ss, entries as AttendanceEntry[], classesParam(req)),
        };
      }

      case "getAnalytics": {
        const ss = openSchool(requireParam(req, "schoolId"));
        const asOfDate = todayIso();
        const students = filterByClasses(readActiveStudents(ss), classesParam(req));
        const scores = readValidatedScores(ss);
        const attendance = readValidatedAttendance(ss);
        const config = readSchoolConfig(ss);
        return {
          ok: true,
          data: buildAnalyticsData(students, scores, attendance, config, asOfDate),
        };
      }

      default:
        return { ok: false, error: `Unknown action "${req.action}".` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function classesParam(req: ApiRequest): string[] {
  const value = req.params?.["classes"];
  return Array.isArray(value) ? value.filter((c): c is string => typeof c === "string") : [];
}

function requireParam(req: ApiRequest, name: string): string {
  const value = req.params?.[name];
  if (!value || typeof value !== "string") throw new Error(`params.${name} is required.`);
  return value;
}

function openSchool(schoolId: string): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const school = findSchoolById(schoolId);
  if (!school) throw new Error(`Unknown school "${schoolId}".`);
  return SpreadsheetApp.openById(school.spreadsheetId);
}

function todayIso(): string {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function toJson(body: ApiResponse): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
