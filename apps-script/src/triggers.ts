// Exactly two installable triggers, total, regardless of how many schools
// exist — see ingestion.ts for why this replaced per-form onFormSubmit
// triggers. Installable (not simple) triggers are required here anyway:
// simple triggers run with restricted permissions and cannot send email or
// call UrlFetchApp, both of which the at-risk sweep needs.

const POLL_HANDLER = "runPollAndValidateSubmissions";
const NIGHTLY_HANDLER = "runNightlyAtRiskSweep";

export function installTriggers(): void {
  removeExistingTriggers(POLL_HANDLER);
  removeExistingTriggers(NIGHTLY_HANDLER);

  ScriptApp.newTrigger(POLL_HANDLER).timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger(NIGHTLY_HANDLER).timeBased().everyDays(1).atHour(2).create();

  Logger.log(
    `Installed triggers: ${POLL_HANDLER} (every 10 min), ${NIGHTLY_HANDLER} (nightly ~02:00).`,
  );
}

function removeExistingTriggers(handlerFunctionName: string): void {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === handlerFunctionName)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
