"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Notice, Spinner } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { enrollmentErrors, isEnrolled, normalizeName, normalizePhone } from "@/lib/enrollment";

export default function CompleteProfile() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/sign-in");
    else if (isEnrolled(session.user as { name?: string; phone?: unknown })) router.replace("/app");
  }, [isPending, session, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const found = enrollmentErrors({ name, phone });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const { error } = await authClient.updateUser({
      name: normalizeName(name) ?? name,
      phone: normalizePhone(phone) ?? phone,
    } as Parameters<typeof authClient.updateUser>[0]);
    setBusy(false);
    if (error) return setMsg("We could not save your details. Please check them and try again.");
    router.replace("/app");
  }

  if (isPending || !session) return <Spinner />;
  const input = "w-full rounded-xl border border-line bg-black px-4 py-3 text-white placeholder:text-muted";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <h1 className="mb-2 text-2xl font-bold">Complete your enrollment</h1>
      <p className="mb-6 text-sm text-muted">We need your name and mobile number to finish setting up {session.user.email}.</p>
      <Card>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="name">Full name</label>
            <input id="name" required maxLength={80} autoComplete="name" className={input} value={name}
              onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="mt-1 text-xs text-white">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="phone">Mobile number with country code</label>
            <input id="phone" type="tel" required maxLength={24} autoComplete="tel" inputMode="tel" className={input}
              value={phone} placeholder="+ country code, then number" onChange={(e) => setPhone(e.target.value)} />
            {errors.phone && <p className="mt-1 text-xs text-white">{errors.phone}</p>}
          </div>
          <Button type="submit" variant="lime" disabled={busy} className="w-full">Save and continue</Button>
        </form>
        {msg && <div className="mt-4"><Notice>{msg}</Notice></div>}
      </Card>
    </main>
  );
}
