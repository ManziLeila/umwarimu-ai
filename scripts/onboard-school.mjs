#!/usr/bin/env node
// Onboards a new school by calling the Apps Script web app's `onboardSchool`
// action — the same endpoint the Node backend would call, exposed here as a
// terminal command for scripted/bulk setup. Also creates the school admin's
// login (username/password) — hashed the same way src/lib/auth.server.ts
// does (scrypt); keep the two in sync if either one changes.
//
// Usage:
//   node scripts/onboard-school.mjs --school-id=kigali-01 \
//     --name="Groupe Scolaire Kigali" --district=Kigali \
//     --admin-email=admin@school.rw --admin-name="Jean Bizimana" \
//     --admin-username=jbizimana
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
  const words = [
    "kigali",
    "amahoro",
    "urumuri",
    "ejo",
    "hazaza",
    "impano",
    "umucyo",
    "intwari",
    "ubuntu",
    "amizero",
  ];
  const first = words[randomInt(0, words.length)];
  let second = words[randomInt(0, words.length)];
  while (second === first) {
    second = words[randomInt(0, words.length)];
  }
  return first + second[0].toUpperCase() + second.slice(1);
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
  if (!args["school-id"] || !args.name || !args["admin-email"] || !args["admin-username"]) {
    console.error(
      "Usage: node scripts/onboard-school.mjs --school-id=... --name=... --district=... --admin-email=... --admin-name=... --admin-username=...",
    );
    process.exitCode = 1;
    return;
  }

  const tempPassword = generateTempPassword();
  const { hash, salt } = hashPassword(tempPassword);

  const body = {
    apiKey,
    action: "onboardSchool",
    params: {
      schoolId: args["school-id"],
      name: args.name,
      district: args.district ?? "",
      adminEmail: args["admin-email"],
      adminName: args["admin-name"] ?? args["admin-email"],
      adminUsername: args["admin-username"],
      adminPasswordHash: hash,
      adminPasswordSalt: salt,
      adminTempPassword: tempPassword,
    },
  };

  const res = await fetch(webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await res.json();

  if (!result.ok) {
    console.error("Onboarding failed:", result.error);
    process.exitCode = 1;
    return;
  }

  console.log("School onboarded:");
  console.log(JSON.stringify(result.data, null, 2));
  console.log(`Admin username: ${args["admin-username"]}`);
  console.log(`Admin temp password: ${tempPassword}`);
  if (!result.data.emailSent) {
    console.log(
      `Email NOT sent (${result.data.emailError ?? "unknown reason"}) — share the password above directly.`,
    );
  }
}

main();
