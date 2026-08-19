# Scores form (template)

Created once by `bootstrap()` (see `createScoresForm` in
[`../src/bootstrap.ts`](../src/bootstrap.ts)), then cloned per school by
`onboardSchool()`.

Questions, in this exact order — the response sheet's columns are positional,
so the order must not change without also updating
[`../src/ingestion.ts`](../src/ingestion.ts):

1. **studentId** — short text, required
2. **subject** — short text, required
3. **date** — date, required
4. **score** — short text, required (validated as a number server-side by
   the ingestion pipeline, not by the form itself)
5. **maxScore** — short text, required

Responses are linked to the school spreadsheet's `Scores` sheet, with a
`Timestamp` column Google Forms always adds first.
