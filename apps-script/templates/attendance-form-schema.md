# Attendance form (template)

Created once by `bootstrap()` (see `createAttendanceForm` in
[`../src/bootstrap.ts`](../src/bootstrap.ts)), then cloned per school by
`onboardSchool()`.

Questions, in this exact order — the response sheet's columns are positional,
so the order must not change without also updating
[`../src/ingestion.ts`](../src/ingestion.ts):

1. **studentId** — short text, required
2. **date** — date, required
3. **attendanceStatus** — dropdown, required: `present` / `absent` / `late`

Responses are linked to the school spreadsheet's `Attendance` sheet, with a
`Timestamp` column Google Forms always adds first.
