/**
 * Enrollment details collected at sign-up: name, email, mobile number.
 * Used by the browser forms for fast feedback and by the auth server hooks as the authority.
 */
export const NAME_MIN = 2;
export const NAME_MAX = 80;

/** Collapses whitespace and trims. Returns null when the name is not acceptable. */
export function normalizeName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return null;
  // Letters in any script, plus space, apostrophe, hyphen, full stop. Blocks markup, digits and symbols.
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '’.\-]*$/u.test(name)) return null;
  return name;
}

/**
 * Normalizes a mobile number to E.164 (+ country code, then 7 to 14 more digits, no leading zero after the +).
 * A number without a country code is rejected rather than guessed.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.trim().replace(/[\s\-().]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return null;
  return compact;
}

export type EnrollmentErrors = { name?: string; phone?: string };

export function enrollmentErrors(input: { name: string; phone: string }): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if (!normalizeName(input.name)) errors.name = "Enter your full name (2 to 80 letters).";
  if (!normalizePhone(input.phone)) errors.phone = "Enter your mobile number with the country code, for example starting with +.";
  return errors;
}

/** True when a session user has everything enrollment requires. */
export function isEnrolled(user: { name?: string | null; phone?: unknown } | null | undefined): boolean {
  if (!user) return false;
  return normalizeName(user.name ?? "") !== null && typeof user.phone === "string" && normalizePhone(user.phone) !== null;
}
