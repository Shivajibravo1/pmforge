import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";
import { normalizeDatabaseUrl } from "./db-url.ts";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

// Vercel "production" is only the validation environment in Phase A, so liveness is its own flag.
const isProd = process.env.PMFORGE_LIVE === "true";

/**
 * Sign-in code delivery.
 * - With RESEND_API_KEY and EMAIL_FROM set, the code is emailed through Resend.
 * - Without them, the code is logged server-side (Phase A testing only) and delivery
 *   throws when PMFORGE_LIVE=true, so a live system can never run without real email.
 * AUTH_TEST_EMAILS limits who can receive a code until the product is live.
 * Non-allowlisted addresses are ignored silently so the allowlist is not revealed.
 */
async function deliverOtp(email: string, otp: string): Promise<void> {
  const allow = (process.env.AUTH_TEST_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!isProd && !allow.includes(email.toLowerCase())) return;

  if (!apiKey || !from) {
    if (isProd) throw new Error("Email delivery is not configured for production");
    console.info(`[auth-test] sign-in code for ${email}: ${otp}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Your PMForge sign-in code: ${otp}`,
      text: `Your PMForge sign-in code is ${otp}. It expires in 5 minutes. If you did not request it, ignore this email.`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    // Log the status only: never the code, the key or the recipient's address.
    console.error(`[auth] email provider returned ${res.status}`);
    throw new Error("Could not send the sign-in email");
  }
}

export const auth = betterAuth({
  baseURL: required("BETTER_AUTH_URL"),
  secret: required("BETTER_AUTH_SECRET"),
  database: new Pool({ connectionString: normalizeDatabaseUrl(required("DATABASE_URL")) }),
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  // Explicit so rate limiting cannot depend on the NODE_ENV default. Per-IP, in memory (one app instance).
  rateLimit: { enabled: true, window: 60, max: 60 },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      // Store only a hash of each code, so a database read does not reveal valid codes.
      storeOTP: "hashed",
      // Code requests per address per window. Matches the library default, stated so it is reviewed.
      rateLimit: { window: 60, max: 3 },
      sendVerificationOTP: async ({ email, otp }) => {
        await deliverOtp(email, otp);
      },
    }),
    jwt({
      jwt: {
        issuer: required("BETTER_AUTH_URL"),
        audience: "pmforge-api",
        expirationTime: "15m",
        definePayload: ({ user }) => ({ email: user.email }),
      },
    }),
  ],
});
