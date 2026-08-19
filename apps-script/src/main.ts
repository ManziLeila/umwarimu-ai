import { handleGet, handlePost } from "./api";
import { runNightlyAtRiskSweep as runAtRiskSweep } from "./alerts";
import { bootstrap, migrateAccountFields } from "./bootstrap";
import { pollAndValidateSubmissions } from "./ingestion";
import { installTriggers } from "./triggers";

export function doGet(e: GoogleAppsScript.Events.DoGet) {
  return handleGet(e);
}

export function doPost(e: GoogleAppsScript.Events.DoPost) {
  return handlePost(e);
}

export function runPollAndValidateSubmissions() {
  pollAndValidateSubmissions();
}

export function runNightlyAtRiskSweep() {
  runAtRiskSweep();
}

export function runInstallTriggers() {
  installTriggers();
}

export function runBootstrap() {
  bootstrap();
}

export function runMigrateAccountFields() {
  migrateAccountFields();
}
