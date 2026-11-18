/**
 * Per-email sliding-window throttle for sign-in code endpoints.
 *
 * Better Auth's own limiter is keyed by client address and path, so one attacker can mail-bomb a single address
 * from many addresses, or guess codes for one account from many. This limits by the target email instead.
 * In memory, so it resets when the app restarts and is per instance (the app runs as one container).
 */

export type Rule = { max: number; windowMs: number };

export const OTP_RULES = {
  send: { max: 5, windowMs: 60 * 60 * 1000 },
  verify: { max: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, Rule>;

export type Bucket = keyof typeof OTP_RULES;

const SEND_PATHS = new Set(["/email-otp/send-verification-otp", "/email-otp/request-password-reset", "/forget-password/email-otp"]);
const VERIFY_PATHS = new Set(["/sign-in/email-otp", "/email-otp/check-verification-otp", "/email-otp/verify-email"]);

export function bucketFor(path: string): Bucket | null {
  if (SEND_PATHS.has(path)) return "send";
  if (VERIFY_PATHS.has(path)) return "verify";
  return null;
}

export class EmailThrottle {
  private hits = new Map<string, number[]>();
  private rules: Record<string, Rule>;
  private maxKeys: number;
  private now: () => number;

  // Plain fields, not constructor parameter properties: the migrate image runs this file with
  // node --experimental-strip-types, which cannot execute that syntax.
  constructor(rules: Record<string, Rule> = OTP_RULES, maxKeys = 10_000, now: () => number = Date.now) {
    this.rules = rules;
    this.maxKeys = maxKeys;
    this.now = now;
  }

  /** Records one attempt. Returns false when the email has used up its allowance for this bucket. */
  allow(bucket: string, email: string): boolean {
    const rule = this.rules[bucket];
    if (!rule) return true;
    const t = this.now();
    const key = `${bucket}|${email.trim().toLowerCase()}`;
    const recent = (this.hits.get(key) ?? []).filter((x) => t - x < rule.windowMs);
    if (recent.length >= rule.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.prune(t);
    return true;
  }

  private prune(t: number) {
    const longest = Math.max(...Object.values(this.rules).map((r) => r.windowMs));
    for (const [k, v] of this.hits) {
      if (v.every((x) => t - x >= longest)) this.hits.delete(k);
    }
    // Still over the cap under a flood of distinct emails: drop the oldest entries so memory stays bounded.
    while (this.hits.size > this.maxKeys) {
      const first = this.hits.keys().next();
      if (first.done) break;
      this.hits.delete(first.value);
    }
  }

  get size(): number {
    return this.hits.size;
  }
}
