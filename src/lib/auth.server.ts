// Server-only: password hashing, the stateless OTP token, and the
// signed/encrypted session cookie that scopes every request to one
// school (and, for a teacher, one or more classes). Never imported from a
// client component.

import {
  clearSession,
  getSession,
  useSession as createSessionManager,
} from "@tanstack/react-start/server";
import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export type Role = "teacher" | "admin" | "network-admin" | "student";

export interface SessionData {
  username: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string;
  schoolName: string;
  classes: string[];
  mustChangePassword: boolean;
  studentId?: string;
}

const SESSION_NAME = "umwarimu_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const OTP_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function sessionConfig() {
  const password = process.env["SESSION_SECRET"];
  if (!password) {
    throw new Error(
      "SESSION_SECRET is not configured (must be at least 32 characters — see .env.example).",
    );
  }
  return { name: SESSION_NAME, password, maxAge: SESSION_MAX_AGE };
}

function secret(): string {
  const value = process.env["SESSION_SECRET"];
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return value;
}

// --- Password hashing (scrypt — Node built-in, no extra dependency) ---

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  return { hash: scryptHash(password, salt), salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = Buffer.from(scryptHash(password, salt), "hex");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function scryptHash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

/** A plain, memorable temporary password for a brand-new account — the
 * admin never has to invent or relay one; it's emailed automatically.
 * Letters only (two distinct words, hyphenated) — easy to read aloud or
 * retype from a phone screen, no digits to mistype or confuse. */
export function generateTempPassword(): string {
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

// --- Stateless OTP token ---
// The code is emailed via Apps Script's MailApp (Node has no email sender).
// Everything needed to verify it later travels with the browser as a signed
// token — no OTP state is stored anywhere server-side, which matters because
// this project's deploy target (Cloudflare Workers, per vite.config.ts) has
// no reliable in-memory state between requests.

interface OtpTokenPayload {
  session: SessionData;
  codeHash: string;
  expiresAt: number;
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function signOtpToken(session: SessionData, code: string): string {
  const payload: OtpTokenPayload = {
    session,
    codeHash: hmac(code),
    expiresAt: Date.now() + OTP_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyOtpToken(token: string, code: string): SessionData | null {
  const [body, signature] = token.split(".");
  if (!body || !signature || signature !== hmac(body)) return null;

  let payload: OtpTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OtpTokenPayload;
  } catch {
    return null;
  }

  if (Date.now() > payload.expiresAt) return null;
  if (payload.codeHash !== hmac(code)) return null;
  return payload.session;
}

function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

// --- Session (mechanism unchanged from Phase 3 — only how a session gets
// established changed, not how it's stored/read) ---

export async function establishSession(data: SessionData): Promise<void> {
  const session = await createSessionManager<SessionData>(sessionConfig());
  await session.update(data);
}

export async function getCurrentSessionData(): Promise<SessionData | null> {
  const session = await getSession<SessionData>(sessionConfig());
  if (!session.data.username) return null;
  return session.data as SessionData;
}

/** Throws rather than returning null/undefined, so callers can't
 * accidentally treat "not signed in" as "signed in with no data". */
export async function requireSession(): Promise<SessionData> {
  const session = await getCurrentSessionData();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function endSession(): Promise<void> {
  await clearSession(sessionConfig());
}
