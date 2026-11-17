"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const clean = email.trim().toLowerCase();
    setEmail(clean);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: clean, type: "sign-in" });
    setBusy(false);
    if (error) setMsg("We could not send a code. Please try again.");
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (error) setMsg("That code is not valid or has expired.");
    else router.replace("/app");
  }

  const input = "w-full rounded-xl border border-line bg-black px-4 py-3 text-white placeholder:text-muted";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <h1 className="mb-6 text-2xl font-bold">Sign in to PM<span className="text-lime">Forge</span></h1>
      <Card>
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block text-sm" htmlFor="email">Work or personal email</label>
            <input id="email" type="email" required maxLength={254} autoComplete="email" className={input} value={email}
              onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="lime" disabled={busy} className="w-full">Email me a code</Button>
            <p className="text-xs text-muted">
              By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and the{" "}
              <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <label className="block text-sm" htmlFor="otp">Enter the 6-digit code sent to {email}</label>
            <input id="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code"
              className={input} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <Button type="submit" variant="lime" disabled={busy} className="w-full">Verify and continue</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("email")}>Use a different email</Button>
          </form>
        )}
        {msg && <div className="mt-4"><Notice>{msg}</Notice></div>}
      </Card>
    </main>
  );
}
