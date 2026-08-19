import {
  DEFAULT_SCHOOL_CONFIG,
  getMasterRegistrySpreadsheetId,
  setScriptProperties,
} from "./config";
import {
  listSchools,
  SCHOOLS_HEADERS,
  SCHOOLS_SHEET,
  STAFF_HEADERS,
  STAFF_SHEET,
  STUDENT_ACCOUNTS_HEADERS,
  STUDENT_ACCOUNTS_SHEET,
} from "./registry";
import {
  applyListValidation,
  ensureHeaders,
  getOrCreateSheet,
  linkFormResponses,
} from "./sheetAccess";

export const STUDENTS_HEADERS = [
  "studentId",
  "name",
  "className",
  "guardianName",
  "guardianEmail",
  "status",
  "username",
  "passwordHash",
  "passwordSalt",
  "mustChangePassword",
  "studentEmail",
];
const CONFIG_HEADERS = ["key", "value"];
const ALERT_LOG_HEADERS = ["studentId", "reason", "subjects", "dateSent", "recipients", "alertId"];
const DATA_ISSUES_HEADERS = ["detectedAt", "sheet", "studentId", "reason", "rawRow"];

/**
 * One-time system setup. Run manually from the Apps Script editor
 * (`clasp open`, then select and run `runBootstrap`) so the interactive
 * Google OAuth consent screen can be shown — this cannot be scripted from
 * outside the editor. Creates the Master Registry, the per-school template
 * spreadsheet, and the two template forms, then stores every resulting ID
 * in Script Properties. Safe to inspect afterwards; not safe to re-run
 * blindly (it always creates fresh files).
 */
export function bootstrap(): Record<string, string> {
  const registry = createMasterRegistry();
  const template = createTemplateSpreadsheet();
  const scoresForm = createScoresForm(template);
  const attendanceForm = createAttendanceForm(template);

  const props = {
    MASTER_REGISTRY_SPREADSHEET_ID: registry.getId(),
    TEMPLATE_SPREADSHEET_ID: template.getId(),
    TEMPLATE_SCORES_FORM_ID: scoresForm.getId(),
    TEMPLATE_ATTENDANCE_FORM_ID: attendanceForm.getId(),
  };
  setScriptProperties(props);
  Logger.log(JSON.stringify(props, null, 2));
  return props;
}

/**
 * Run once after a schema change (like adding account/login fields) to bring
 * an already-bootstrapped Master Registry and every already-onboarded
 * school's spreadsheet up to date — appends any missing headers/sheets
 * without touching existing data. Safe to run more than once.
 */
export function migrateAccountFields(): void {
  const registry = SpreadsheetApp.openById(getMasterRegistrySpreadsheetId());

  const staffSheet = registry.getSheetByName(STAFF_SHEET);
  if (staffSheet) ensureHeaders(staffSheet, STAFF_HEADERS);
  getOrCreateSheet(registry, STUDENT_ACCOUNTS_SHEET, STUDENT_ACCOUNTS_HEADERS);

  let migratedSchools = 0;
  for (const school of listSchools()) {
    const ss = SpreadsheetApp.openById(school.spreadsheetId);
    const studentsSheet = ss.getSheetByName("Students");
    if (studentsSheet) {
      ensureHeaders(studentsSheet, STUDENTS_HEADERS);
      migratedSchools += 1;
    }
  }
  Logger.log(`Migrated Master Registry + ${migratedSchools} school spreadsheet(s).`);
}

function createMasterRegistry(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const ss = SpreadsheetApp.create("Umwarimu AI — Master Registry");
  getOrCreateSheet(ss, SCHOOLS_SHEET, SCHOOLS_HEADERS);
  getOrCreateSheet(ss, STAFF_SHEET, STAFF_HEADERS);
  getOrCreateSheet(ss, STUDENT_ACCOUNTS_SHEET, STUDENT_ACCOUNTS_HEADERS);
  removeDefaultSheet(ss);
  return ss;
}

function createTemplateSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const ss = SpreadsheetApp.create("Umwarimu AI — School Template");

  const studentsSheet = getOrCreateSheet(ss, "Students", STUDENTS_HEADERS);
  applyListValidation(studentsSheet, "status", ["active", "inactive"]);

  const configSheet = getOrCreateSheet(ss, "Config", CONFIG_HEADERS);
  if (configSheet.getLastRow() < 2) {
    configSheet.getRange(2, 1, 3, 2).setValues([
      ["lowScorePct", DEFAULT_SCHOOL_CONFIG.lowScorePct],
      ["attendanceThresholdPct", DEFAULT_SCHOOL_CONFIG.attendanceThresholdPct],
      ["rollingPeriodDays", DEFAULT_SCHOOL_CONFIG.rollingPeriodDays],
    ]);
  }

  getOrCreateSheet(ss, "AlertLog", ALERT_LOG_HEADERS);
  getOrCreateSheet(ss, "DataIssues", DATA_ISSUES_HEADERS);
  removeDefaultSheet(ss);
  return ss;
}

function createScoresForm(
  template: GoogleAppsScript.Spreadsheet.Spreadsheet,
): GoogleAppsScript.Forms.Form {
  const form = FormApp.create("Umwarimu AI — Scores");
  form.setDescription("Log a quiz/exam score for one student.");
  form.addTextItem().setTitle("studentId").setRequired(true);
  form.addTextItem().setTitle("subject").setRequired(true);
  form.addDateItem().setTitle("date").setRequired(true);
  form.addTextItem().setTitle("score").setRequired(true);
  form.addTextItem().setTitle("maxScore").setRequired(true);
  linkFormResponses(form, template, "Scores");
  return form;
}

function createAttendanceForm(
  template: GoogleAppsScript.Spreadsheet.Spreadsheet,
): GoogleAppsScript.Forms.Form {
  const form = FormApp.create("Umwarimu AI — Attendance");
  form.setDescription("Log attendance for one student.");
  form.addTextItem().setTitle("studentId").setRequired(true);
  form.addDateItem().setTitle("date").setRequired(true);
  form
    .addListItem()
    .setTitle("attendanceStatus")
    .setRequired(true)
    .setChoiceValues(["present", "absent", "late"]);
  linkFormResponses(form, template, "Attendance");
  return form;
}

function removeDefaultSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
}
