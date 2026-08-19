// Script Properties are this project's only source of secrets/config.
// Set them under Apps Script > Project Settings > Script Properties, never
// hardcoded here. MASTER_REGISTRY_SPREADSHEET_ID and the TEMPLATE_* ids are
// written automatically by bootstrap() the first time it runs.

function requireProperty(key: string, hint?: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`Script property "${key}" is not set.${hint ? ` ${hint}` : ""}`);
  }
  return value;
}

export function getApiKey(): string {
  return requireProperty("APPS_SCRIPT_API_KEY", "Set it to a long random string shared with the Node backend.");
}

export function getGeminiApiKey(): string {
  return requireProperty("GEMINI_API_KEY");
}

export function getMasterRegistrySpreadsheetId(): string {
  return requireProperty("MASTER_REGISTRY_SPREADSHEET_ID", "Run bootstrap() once from the Apps Script editor.");
}

export function getTemplateSpreadsheetId(): string {
  return requireProperty("TEMPLATE_SPREADSHEET_ID", "Run bootstrap() once from the Apps Script editor.");
}

export function getTemplateScoresFormId(): string {
  return requireProperty("TEMPLATE_SCORES_FORM_ID", "Run bootstrap() once from the Apps Script editor.");
}

export function getTemplateAttendanceFormId(): string {
  return requireProperty("TEMPLATE_ATTENDANCE_FORM_ID", "Run bootstrap() once from the Apps Script editor.");
}

export function setScriptProperties(values: Record<string, string>): void {
  PropertiesService.getScriptProperties().setProperties(values, false);
}

export const DEFAULT_SCHOOL_CONFIG = {
  lowScorePct: 50,
  attendanceThresholdPct: 80,
  rollingPeriodDays: 30,
};
