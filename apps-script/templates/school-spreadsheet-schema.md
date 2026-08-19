# School spreadsheet schema (template)

Created once by `bootstrap()`, then cloned per school by `onboardSchool()`.
This file documents the schema for review — the live source of truth is the
"Umwarimu AI — School Template" spreadsheet in Drive once bootstrapped.

## Students

| studentId | name | className | guardianName | guardianEmail | status |
|---|---|---|---|---|---|

`status` has list validation: `active` / `inactive`.

## Scores (Google Form response destination)

| Timestamp | studentId | subject | date | score | maxScore | _status | _flagReason | _processedAt |
|---|---|---|---|---|---|---|---|---|

`_status`, `_flagReason`, `_processedAt` are appended by the system, never
filled in by the form. `_status` is `""` (unprocessed), `"ok"`, or `"flagged"`
— set by the shared poll-and-validate trigger (see
[`../src/ingestion.ts`](../src/ingestion.ts)).

## Attendance (Google Form response destination)

| Timestamp | studentId | date | attendanceStatus | _status | _flagReason | _processedAt |
|---|---|---|---|---|---|---|

## Config

| key | value |
|---|---|
| lowScorePct | 50 |
| attendanceThresholdPct | 80 |
| rollingPeriodDays | 30 |

Editable directly in the Sheet by school admin staff — no separate settings
UI in this phase.

## AlertLog

| studentId | reason | subjects | dateSent | recipients | alertId |
|---|---|---|---|---|---|

Filled in by the nightly at-risk sweep ([`../src/alerts.ts`](../src/alerts.ts)).
`reason` holds a machine-readable fingerprint of *why* the student was
flagged (e.g. `subjects:Mathematics|attendance:false`) — it's what the sweep
compares against on the next run to avoid re-sending an identical alert
every night while a problem persists unchanged; it also doubles as a
human-scannable summary. `subjects` is the same information rendered for
quick reading. `alertId` (`studentId-date`) is a per-row audit key.

## DataIssues

| detectedAt | sheet | studentId | reason | rawRow |
|---|---|---|---|---|

Every row the ingestion pipeline flags (bad score, unknown student ID,
duplicate entry) lands here — nothing is silently dropped.
