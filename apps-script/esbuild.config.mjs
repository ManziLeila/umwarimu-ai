import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

// Bundles the whole apps-script project into one file. Apps Script's V8
// runtime does not understand `import`/`export`, so bundling isn't optional —
// but a plain IIFE bundle buries every function inside one anonymous
// closure, which breaks the editor's "select a function to run" dropdown
// (it only detects real top-level `function` declarations). Fix: bundle
// with a `globalName` so main.ts's exports land on one global object, then
// append a footer of thin top-level functions that just forward to it —
// those *are* visible to the dropdown, and to doGet/doPost/trigger lookups.
const ENTRY_POINTS = [
  "doGet",
  "doPost",
  "runPollAndValidateSubmissions",
  "runNightlyAtRiskSweep",
  "runInstallTriggers",
  "runBootstrap",
  "runMigrateAccountFields",
];

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/Code.js",
  format: "iife",
  globalName: "Umwarimu",
  target: "es2019",
  platform: "neutral",
  legalComments: "none",
  logLevel: "info",
  footer: {
    js: ENTRY_POINTS.map(
      (name) => `function ${name}() { return Umwarimu.${name}.apply(null, arguments); }`,
    ).join("\n"),
  },
});

// clasp pushes everything in rootDir (dist/) as one project — the manifest
// has to live alongside Code.js there, not just at the repo root.
copyFileSync("appsscript.json", "dist/appsscript.json");

console.log("Built dist/Code.js + dist/appsscript.json — push with `npm run push` (requires `clasp login`/`clasp create` first).");
