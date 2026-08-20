#!/usr/bin/env node
// Creates the platform-wide network-admin account — sees and manages every
// school, not scoped to any single one. There's no self-service path for
// this role on purpose. Hashes the temp password the same way
// src/lib/auth.server.ts does (scrypt) — keep the two in sync if either one
// changes.
//
// Usage:
//   node scripts/create-network-admin.mjs --email=you@example.com \
//     --name="Your Name" --username=network-admin
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
  return `${first}-${second}`;
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
  if (!args.email || !args.username) {
    console.error(
      'Usage: node scripts/create-network-admin.mjs --email=... --name="..." --username=...',
    );
    process.exitCode = 1;
    return;
  }

  const tempPassword = generateTempPassword();
  const { hash, salt } = hashPassword(tempPassword);

  const body = {
    apiKey,
    action: "createNetworkAdmin",
    params: {
      email: args.email,
      name: args.name ?? args.email,
      username: args.username,
      passwordHash: hash,
      passwordSalt: salt,
      tempPassword,
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

  console.log(`Network admin created: ${args.username}.`);
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
