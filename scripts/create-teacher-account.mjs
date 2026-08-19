#!/usr/bin/env node
// Creates a teacher/admin account by calling the Apps Script web app's
// `createTeacherAccount` action directly — a stopgap until the admin-facing
// account-management UI (Phase 5b) exists. Hashes the temp password the
// same way src/lib/auth.server.ts does (scrypt) — keep the two in sync if
// either one changes.
//
// Usage:
//   node scripts/create-teacher-account.mjs --school-id=kigali-parents \
//     --email=teacher@example.com --name="Jean Bizimana" --username=jbizimana \
//     --role=teacher --classes="S3 Mathematics"
//
// Requires APPS_SCRIPT_WEB_APP_URL and APPS_SCRIPT_API_KEY in the
// environment (see .env.example at the repo root).

import { randomBytes, randomInt, scryptSync } from "node:crypto";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function generateTempPassword() {
  const words = ["kigali", "amahoro", "urumuri", "ejo", "hazaza", "impano"];
  const word = words[randomInt(0, words.length)];
  return `${word}-${randomInt(1000, 9999)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const webAppUrl = process.env.APPS_SCRIPT_WEB_APP_URL;
  const apiKey = process.env.APPS_SCRIPT_API_KEY;

  if (!webAppUrl || !apiKey) {
    console.error("Set APPS_SCRIPT_WEB_APP_URL and APPS_SCRIPT_API_KEY in your environment first.");
    process.exitCode = 1;
    return;
  }
  if (!args["school-id"] || !args.email || !args.name || !args.username) {
    console.error(
      'Usage: node scripts/create-teacher-account.mjs --school-id=... --email=... --name=... --username=... [--role=teacher|admin] [--classes="S3 Mathematics,S3 English"]',
    );
    process.exitCode = 1;
    return;
  }

  const tempPassword = generateTempPassword();
  const { hash, salt } = hashPassword(tempPassword);

  const body = {
    apiKey,
    action: "createTeacherAccount",
    params: {
      schoolId: args["school-id"],
      email: args.email,
      name: args.name,
      username: args.username,
      passwordHash: hash,
      passwordSalt: salt,
      tempPassword,
      role: args.role ?? "teacher",
      classes: args.classes ? args.classes.split(",").map((c) => c.trim()) : [],
    },
  };

  const res = await fetch(webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await res.json();

  if (!result.ok) {
    console.error("Account creation failed:", result.error);
    process.exitCode = 1;
    return;
  }

  // Always print the temp password — never rely solely on the email
  // succeeding, since account creation itself already happened either way.
  console.log(`Account created for ${args.username}.`);
  console.log(`Temp password: ${tempPassword}`);
  if (result.data?.emailSent) {
    console.log(`Also emailed to ${args.email}.`);
  } else {
    console.log(
      `Email NOT sent (${result.data?.emailError ?? "unknown reason"}) — share the password above directly.`,
    );
  }
}

main();
