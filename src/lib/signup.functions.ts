import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public — no session required. This is deliberately the *only*
// self-service sign-up in the app: it registers a new school and its first
// admin. Teachers and students are always created by that admin afterward
// (see admin.functions.ts) — there's no general "anyone can sign up" flow.
const SignUpSchoolInput = z.object({
  schoolName: z.string().min(2, "School name is too short."),
  district: z.string().min(1, "District is required."),
  adminName: z.string().min(1, "Your name is required."),
  adminEmail: z.string().email("Enter a valid email address."),
  adminUsername: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .regex(/^[a-z0-9._-]+$/i, "Use only letters, numbers, dots, dashes or underscores."),
});

export const signUpSchool = createServerFn({ method: "POST" })
  .validator((input: unknown) => SignUpSchoolInput.parse(input))
  .handler(async ({ data }) => {
    const { hashPassword, generateTempPassword } = await import("./auth.server");
    const { onboardSchool } = await import("./backend.server");

    const tempPassword = generateTempPassword();
    const { hash, salt } = hashPassword(tempPassword);
    const schoolId = slugify(data.schoolName);

    try {
      const result = await onboardSchool({
        schoolId,
        name: data.schoolName,
        district: data.district,
        adminEmail: data.adminEmail,
        adminName: data.adminName,
        adminUsername: data.adminUsername,
        adminPasswordHash: hash,
        adminPasswordSalt: salt,
        adminTempPassword: tempPassword,
      });
      return {
        ok: true as const,
        emailSent: result.emailSent,
        tempPassword: result.emailSent ? undefined : tempPassword,
      };
    } catch (err) {
      return {
        ok: false as const,
        error:
          err instanceof Error ? err.message : "Couldn't create your school. Please try again.",
      };
    }
  });

function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "school";
  // Not a secret, just enough to make two schools with the same name not collide.
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
