"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Notice, Spinner } from "@/components/ui";
import { ApiError, type Curriculum, type Me, type Progress, api, friendly, useApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export default function You() {
  const router = useRouter();
  const me = useApi<Me>("/api/v1/me");
  const prog = useApi<Progress>("/api/v1/progress");
  const cur = useApi<Curriculum>("/api/v1/curriculum");
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  if (!me.data || !prog.data || !cur.data) return <Spinner />;

  const done = new Set(prog.data.completed);

  async function claim(level: number) {
    setMsg("");
    try {
      const r = await api<{ code: string }>(`/api/v1/certificates/${level}`, { method: "POST" });
      setCodes((c) => ({ ...c, [level]: r.code }));
    } catch (e) {
      setMsg(friendly(e as ApiError));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">You</h1>
      <Card>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium">{me.data.email}</p>
        <p className="mt-2 text-sm text-muted">Plan: {me.data.tier === "paid" ? "Full program" : "Free"} · {prog.data.total_xp} XP · {prog.data.streak} day streak</p>
      </Card>
      <h2 className="font-semibold">Certificates</h2>
      {cur.data.levels.map((lv) => {
        const complete = lv.days.every((d) => done.has(d.day));
        return (
          <Card key={lv.id} className="flex items-center justify-between gap-3">
            <div><p className="font-medium">Level {lv.id}: {lv.title}</p>
              {codes[lv.id] && <Link className="text-sm text-lime underline" href={`/verify/${codes[lv.id]}`}>Verification page</Link>}
            </div>
            <Button variant="ghost" disabled={!complete} onClick={() => claim(lv.id)}>{complete ? "Claim" : "Locked"}</Button>
          </Card>
        );
      })}
      {msg && <Notice>{msg}</Notice>}
      {me.data.role === "admin" && <Link href="/app/admin" className="block text-sm underline">Admin</Link>}
      <Button variant="ghost" onClick={async () => { await authClient.signOut(); router.replace("/"); }}>Sign out</Button>
    </div>
  );
}
