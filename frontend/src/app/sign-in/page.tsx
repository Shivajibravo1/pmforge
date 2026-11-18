"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { enrollmentErrors, isEnrolled, normalizeName, normalizePhone } from "@/lib/enrollment";

type Mode = "signup" | "signin";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signin" ? "signin" : "signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "code">("details");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  function switchMode(next: Mode) {
    setMode(next);
    setStep("details");
    setMsg("");
    setErrors({});
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (mode === "signup") {
      const found = enrollmentErrors({ name, phone });
      setErrors(found);
      if (Object.keys(found).length) return;
      if (!agree) return setMsg("Please accept the Terms and the Privacy Policy to enroll.");
    }
    setBusy(true);
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
    const { data, error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) {
      setBusy(false);
      return setMsg("That code is not valid or has expired.");
    }
    // Enrollment details are saved only after the email is verified.
    if (mode === "signup" && !isEnrolled(data?.user as { name?: string; phone?: unknown })) {
      const { error: saveError } = await authClient.updateUser({
        name: normalizeName(name) ?? name,
        phone: normalizePhone(phone) ?? phone,
      } as Parameters<typeof authClient.updateUser>[0]);
      if (saveError) {
        setBusy(false);
        return router.replace("/complete-profile");
      }
    }
    setBusy(false);
    router.replace("/app");
  }

  const input = "w-full rounded-xl border border-line bg-black px-4 py-3 text-white placeholder:text-muted";
  const tab = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-violet text-white" : "text-muted hover:text-white"}`;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <h1 className="mb-6 text-2xl font-bold">
        {mode === "signup" ? "Enroll in" : "Sign in to"} PM<span className="text-lime">Forge</span>
      </h1>
      <Card>
        <div role="tablist" aria-label="Enroll or sign in" className="mb-5 flex gap-1 rounded-xl bg-black p-1">
          <button type="button" role="tab" aria-selected={mode === "signup"} className={tab(mode === "signup")} onClick={() => switchMode("signup")}>Enroll</button>
          <button type="button" role="tab" aria-selected={mode === "signin"} className={tab(mode === "signin")} onClick={() => switchMode("signin")}>Sign in</button>
        </div>
        {step === "details" ? (
          <form onSubmit={sendCode} className="space-y-4" noValidate={mode === "signup"}>
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1 block text-sm" htmlFor="name">Full name</label>
                  <input id="name" required maxLength={80} autoComplete="name" className={input} value={name}
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined}
                    onChange={(e) => setName(e.target.value)} />
                  {errors.name && <p id="name-err" className="mt-1 text-xs text-white">{errors.name}</p>}
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-sm" htmlFor="email">Work or personal email</label>
              <input id="email" type="email" required maxLength={254} autoComplete="email" className={input} value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1 block text-sm" htmlFor="phone">Mobile number with country code</label>
                  <input id="phone" type="tel" required maxLength={24} autoComplete="tel" inputMode="tel" className={input}
                    value={phone} placeholder="+ country code, then number"
                    aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined}
                    onChange={(e) => setPhone(e.target.value)} />
                  {errors.phone && <p id="phone-err" className="mt-1 text-xs text-white">{errors.phone}</p>}
                </div>
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>
                    I agree to the <Link href="/terms" className="underline">Terms</Link> and the{" "}
                    <Link href="/privacy" className="underline">Privacy Policy</Link>. I understand my mobile number is used for
                    account and service messages. Optional daily interview questions by email are a separate choice I make later.
                  </span>
                </label>
              </>
            )}
            <Button type="submit" variant="lime" disabled={busy} className="w-full">
              {mode === "signup" ? "Email me a code to enroll" : "Email me a code"}
            </Button>
            {mode === "signin" && (
              <p className="text-xs text-muted">
                By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and the{" "}
                <Link href="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <label className="block text-sm" htmlFor="otp">Enter the 6-digit code sent to {email}</label>
            <input id="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code"
              className={input} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <Button type="submit" variant="lime" disabled={busy} className="w-full">Verify and continue</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("details")}>Use a different email</Button>
          </form>
        )}
        {msg && <div className="mt-4"><Notice>{msg}</Notice></div>}
      </Card>
    </main>
  );
}

export default function SignIn() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
