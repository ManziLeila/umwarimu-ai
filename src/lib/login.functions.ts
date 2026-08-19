import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SessionData } from "./auth.server";

const LoginStep1Input = z.object({ username: z.string().min(1), password: z.string().min(1) });

/** Step 1: verify username + password, then email a one-time code and hand
 * the browser a signed token to bring back in step 2. Never reveals whether
 * the username or the password was the wrong part. */
export const loginStep1 = createServerFn({ method: "POST" })
  .validator((input: unknown) => LoginStep1Input.parse(input))
  .handler(async ({ data }) => {
    const { verifyPassword, generateOtpCode, signOtpToken } = await import("./auth.server");
    const { findAccount, sendOtpEmail } = await import("./backend.server");

    let account;
    try {
      account = await findAccount(data.username);
    } catch {
      return { ok: false as const, error: "Invalid username or password." };
    }

    if (!verifyPassword(data.password, account.passwordHash, account.passwordSalt)) {
      return { ok: false as const, error: "Invalid username or password." };
    }

    const session: SessionData = {
      username: account.username,
      name: account.name,
      email: account.email,
      role: account.role,
      schoolId: account.schoolId,
      schoolName: account.schoolName,
      classes: account.classes,
      mustChangePassword: account.mustChangePassword,
      ...(account.studentId ? { studentId: account.studentId } : {}),
    };

    const code = generateOtpCode();
    const otpToken = signOtpToken(session, code);

    try {
      await sendOtpEmail(account.email, code);
    } catch (err) {
      return {
        ok: false as const,
        error:
          err instanceof Error ? err.message : "Couldn't send the sign-in code. Please try again.",
      };
    }

    // Masks the email a little so the OTP-entry screen can say "sent to
    // j***@example.com" without fully exposing it.
    return { ok: true as const, otpToken, maskedEmail: maskEmail(account.email) };
  });

const LoginStep2Input = z.object({ otpToken: z.string().min(1), code: z.string().min(1) });

export const loginStep2 = createServerFn({ method: "POST" })
  .validator((input: unknown) => LoginStep2Input.parse(input))
  .handler(async ({ data }) => {
    const { verifyOtpToken, establishSession } = await import("./auth.server");

    const session = verifyOtpToken(data.otpToken, data.code);
    if (!session) {
      return {
        ok: false as const,
        error: "That code is incorrect or has expired. Please try signing in again.",
      };
    }

    await establishSession(session);
    return { ok: true as const, mustChangePassword: session.mustChangePassword };
  });

const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export const changePassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => ChangePasswordInput.parse(input))
  .handler(async ({ data }) => {
    const { requireSession, verifyPassword, hashPassword } = await import("./auth.server");
    const { findAccount, updatePassword } = await import("./backend.server");

    const session = await requireSession();
    const account = await findAccount(session.username);

    if (!verifyPassword(data.currentPassword, account.passwordHash, account.passwordSalt)) {
      return { ok: false as const, error: "Current password is incorrect." };
    }

    const { hash, salt } = hashPassword(data.newPassword);
    await updatePassword(account.kind, account.username, hash, salt);

    return { ok: true as const };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await import("./auth.server");
  await endSession();
  return { ok: true as const };
});

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getCurrentSessionData } = await import("./auth.server");
  return await getCurrentSessionData();
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
