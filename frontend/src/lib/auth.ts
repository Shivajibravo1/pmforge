import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const isProd = process.env.VERCEL_ENV === "production" || process.env.PMFORGE_LIVE === "true";

/** Phase A: no email provider yet. OTPs are logged server-side for allowlisted testers only. */
async function deliverOtp(email: string, otp: string): Promise<void> {
  const allow = (process.env.AUTH_TEST_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (isProd) throw new Error("Email delivery is not configured for production");
  if (!allow.includes(email.toLowerCase())) return; // silently ignore: do not reveal who is allowlisted
  console.info(`[auth-test] sign-in code for ${email}: ${otp}`);
}

export const auth = betterAuth({
  baseURL: required("BETTER_AUTH_URL"),
  secret: required("BETTER_AUTH_SECRET"),
  database: new Pool({ connectionString: required("DATABASE_URL") }),
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
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
