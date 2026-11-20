"use client";
import { BookOpen, CheckCircle2, Flag, Flame, Lock, Map as MapIcon, Rocket, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Character } from "@/components/character";
import { InterviewEmailCard } from "@/components/interview-email-card";
import { SampleCertificate } from "@/components/sample-certificate";
import { UpgradeOptions } from "@/components/upgrade-options";
import { Button, Card, LoadError, Notice, Spinner } from "@/components/ui";
import { ApiError, type Curriculum, type Me, type Progress, api, friendly, useApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { FORMS, badges, formFor, formProgress, nextForm } from "@/lib/gamify";

const BADGE_ICON = { flag: Flag, check: CheckCircle2, zap: Zap, book: BookOpen, map: MapIcon, rocket: Rocket, spark: Sparkles } as const;

export default function You() {
  const router = useRouter();
  const me = useApi<Me>("/api/v1/me");
  const prog = useApi<Progress>("/api/v1/progress");
  const cur = useApi<Curriculum>("/api/v1/curriculum");
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [sampleLevel, setSampleLevel] = useState<number | null>(null);
  const failed = me.error ?? prog.error ?? cur.error;
  if (failed) return <LoadError status={failed.status} onRetry={() => { me.reload(); prog.reload(); cur.reload(); }} />;
  if (!me.data || !prog.data || !cur.data) return <Spinner />;

  const xp = prog.data.total_xp;
  const form = formFor(xp);
  const next = nextForm(xp);
  const pct = formProgress(xp);
  // Admin preview: unlocks every form, badge and certificate view. Real XP, streak and progress stay real.
  const adminAll = me.data.role === "admin" && showAll;
  const unlockedTier = adminAll ? FORMS.length : form.tier;
  const shown = FORMS[(preview ?? form.tier) - 1];
  const locked = shown.tier > unlockedTier;
  const done = new Set(prog.data.completed);
  const earned = badges(prog.data).map((b) => (adminAll ? { ...b, earned: true } : b));

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
    <div className="space-y-5">
      {me.data.role === "admin" && (
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Admin preview</p>
            <p className="text-xs text-muted">Shows every form, badge and certificate. Your XP, streak and lessons stay real.</p>
          </div>
          <Button variant="ghost" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}>{showAll ? "Preview on" : "Preview off"}</Button>
        </Card>
      )}
      {me.data.role !== "admin" && (
        <Card>
          <p className="text-sm font-semibold">
            {me.data.tier === "paid"
              ? me.data.paid_until ? `Full program active until ${me.data.paid_until}` : "Full program active"
              : "Free plan: Days 1 to 7"}
          </p>
          {!(me.data.tier === "paid" && !me.data.paid_until) && (
            <div className="mt-3"><UpgradeOptions email={me.data.email} renew={me.data.tier === "paid"} /></div>
          )}
        </Card>
      )}
      <section aria-label="Your character" className="relative overflow-hidden rounded-3xl border border-violet bg-gradient-to-b from-[#1a0f3d] via-surface to-black p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-lime">Form {shown.tier} of {FORMS.length}</p>
        <div className="mx-auto mt-2 flex justify-center"><Character tier={shown.tier} size={210} silhouette={locked} /></div>
        <h1 className="mt-1 text-2xl font-bold">{locked ? "Locked form" : shown.title}</h1>
        <p className="text-sm text-muted">{locked ? `Reach ${shown.minXp.toLocaleString()} XP to unlock ${shown.name}` : shown.blurb}</p>

        <div className="mx-auto mt-5 max-w-md text-left">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span className="font-semibold text-white">{xp.toLocaleString()} XP</span>
            <span>{next ? `${(next.minXp - xp).toLocaleString()} XP to ${next.name}` : "Max form reached"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to next form">
            <div className="pm-shimmer h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[[Flame, `${prog.data.streak}`, "Day streak"], [CheckCircle2, `${done.size}`, "Lessons done"], [Zap, `${form.tier}`, "Current form"]].map(([Icon, v, l]) => {
            const I = Icon as typeof Flame;
            return (
              <div key={l as string} className="rounded-2xl border border-line bg-black/50 p-3">
                <I aria-hidden className="mx-auto h-5 w-5 text-lime" /><p className="mt-1 text-xl font-bold">{v as string}</p><p className="text-xs text-muted">{l as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Evolution path">
        <h2 className="mb-2 font-semibold">Evolution path</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FORMS.map((f) => {
            const isLocked = f.tier > unlockedTier;
            const active = shown.tier === f.tier;
            return (
              <button key={f.tier} type="button" onClick={() => setPreview(f.tier)} aria-pressed={active}
                className={`relative flex min-h-11 w-24 shrink-0 flex-col items-center rounded-2xl border p-2 transition ${active ? "border-lime bg-surface2" : "border-line bg-surface hover:border-violet"}`}>
                <Character tier={f.tier} size={64} silhouette={isLocked} />
                <span className="mt-1 text-xs font-semibold">{isLocked ? "???" : f.name}</span>
                <span className="text-[10px] text-muted">{f.minXp.toLocaleString()} XP</span>
                {isLocked && <Lock aria-hidden className="absolute right-2 top-2 h-3.5 w-3.5 text-muted" />}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Badges">
        <h2 className="mb-2 font-semibold">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {earned.map((b) => {
            const I = BADGE_ICON[b.icon as keyof typeof BADGE_ICON] ?? Sparkles;
            return (
              <div key={b.id} className={`rounded-2xl border p-3 text-center ${b.earned ? "pm-pop border-lime bg-lime/10" : "border-line bg-surface opacity-60"}`}>
                <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${b.earned ? "bg-lime text-black" : "bg-surface2 text-muted"}`}>
                  {b.earned ? <I aria-hidden className="h-5 w-5" /> : <Lock aria-hidden className="h-4 w-4" />}
                </span>
                <p className="mt-2 text-sm font-semibold">{b.label}</p><p className="text-xs text-muted">{b.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

      <h2 className="font-semibold">Certificates</h2>
      {cur.data.levels.map((lv) => {
        const complete = lv.days.every((d) => done.has(d.day));
        return (
          <div key={lv.id} className="space-y-3">
            <Card className="flex items-center justify-between gap-3">
              <div><p className="font-medium">Level {lv.id}: {lv.title}</p>
                {codes[lv.id] && <Link className="text-sm text-lime underline" href={`/verify/${codes[lv.id]}`}>Verification page</Link>}
              </div>
              <div className="flex gap-2">
                {adminAll && <Button variant="ghost" onClick={() => setSampleLevel(sampleLevel === lv.id ? null : lv.id)}>Sample</Button>}
                <Button variant="ghost" disabled={!complete} onClick={() => claim(lv.id)}>{complete ? "Claim" : "Locked"}</Button>
              </div>
            </Card>
            {adminAll && sampleLevel === lv.id && <SampleCertificate level={lv.id} title={lv.title} lessons={lv.days.length} onClose={() => setSampleLevel(null)} />}
          </div>
        );
      })}
      {msg && <Notice>{msg}</Notice>}
      <InterviewEmailCard />
      <Card>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium">{me.data.email}</p>
        <p className="mt-1 text-sm text-muted">Plan: {me.data.tier === "paid" ? "Full program" : "Free"}</p>
      </Card>
      {me.data.role === "admin" && <Link href="/app/admin" className="block text-sm underline">Admin</Link>}
      <Button variant="ghost" onClick={async () => { await authClient.signOut(); router.replace("/"); }}>Sign out</Button>
    </div>
  );
}
