"use client";
import { useState } from "react";
import { Badge, Button, Card, LoadError, Notice, Spinner } from "@/components/ui";
import { ApiError, api, friendly, useApi } from "@/lib/api";

export type AdminUser = {
  id: string; email: string; role: string; tier: string; plan: "free" | "paid" | "admin";
  created_at: string; lessons_done: number; total_xp: number; last_active: string | null;
};
type UserList = { total: number; items: AdminUser[] };
type UserDetailData = {
  id: string; email: string; plan: "free" | "paid" | "admin"; created_at: string;
  progress: { day: number; xp: number; completed_on: string }[];
  reviews: { day: number; score: number; created_at: string }[];
  certificates: { level: number; issued_at: string }[];
  ai_usage_month: { kind: string; calls: number; cost_usd: number }[];
  audit: { action: string; detail: { from?: string; to?: string }; admin_id: string; created_at: string }[];
};

const PAGE = 20;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "None yet");

export function PlanBadge({ plan }: { plan: "free" | "paid" | "admin" }) {
  if (plan === "admin") return <Badge tone="violet">Admin</Badge>;
  return plan === "paid" ? <Badge tone="lime">Paid</Badge> : <Badge>Free</Badge>;
}

export function UsersList({ items, selected, onSelect }: { items: AdminUser[]; selected: string | null; onSelect: (id: string) => void }) {
  if (items.length === 0) return <p className="text-sm text-muted">No users match.</p>;
  return (
    <ul className="space-y-2">
      {items.map((u) => (
        <li key={u.id}>
          <button type="button" onClick={() => onSelect(u.id)} aria-pressed={selected === u.id}
            className={`w-full rounded-2xl border p-4 text-left transition ${selected === u.id ? "border-lime bg-surface2" : "border-line bg-surface hover:border-violet"}`}>
            <span className="flex items-center justify-between gap-3">
              <span className="break-all font-medium">{u.email || u.id}</span>
              <PlanBadge plan={u.plan} />
            </span>
            <span className="mt-1 block text-xs text-muted">
              {u.lessons_done} lessons · {u.total_xp} XP · last active {day(u.last_active)} · joined {day(u.created_at)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function UserDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { data, error, reload } = useApi<UserDetailData>(`/api/v1/admin/users/${encodeURIComponent(id)}`);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;

  async function setTier(tier: "free" | "paid") {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/v1/admin/users/${encodeURIComponent(id)}/tier`, { method: "PUT", body: { tier } });
      await reload();
      onChanged();
    } catch (e) {
      setMsg(friendly(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="break-all font-semibold">{data.email || data.id}</p><p className="text-xs text-muted">Joined {day(data.created_at)}</p></div>
        <PlanBadge plan={data.plan} />
      </div>

      {data.plan === "admin" ? (
        <p className="text-sm text-muted">Admin account. Full access to every lesson and module, not on a plan.</p>
      ) : (
        <Button variant="ghost" disabled={busy} onClick={() => setTier(data.plan === "paid" ? "free" : "paid")}>
          {data.plan === "paid" ? "Change to Free" : "Change to Paid"}
        </Button>
      )}
      {msg && <Notice>{msg}</Notice>}

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[["Lessons", data.progress.length], ["Reviews", data.reviews.length], ["Certificates", data.certificates.length]].map(([k, v]) => (
          <div key={k as string} className="rounded-xl border border-line bg-black/40 p-2"><dt className="text-xs text-muted">{k}</dt><dd className="text-lg font-bold">{v}</dd></div>
        ))}
      </dl>

      <section aria-label="Completed days"><h3 className="text-sm font-semibold">Completed days</h3>
        <p className="mt-1 text-sm text-muted">{data.progress.length ? data.progress.map((p) => p.day).join(", ") : "None yet"}</p></section>

      <section aria-label="Reviews"><h3 className="text-sm font-semibold">Mentor reviews</h3>
        {data.reviews.length === 0 ? <p className="mt-1 text-sm text-muted">None yet</p> : (
          <ul className="mt-1 space-y-1 text-sm text-muted">{data.reviews.map((r, i) => <li key={i}>Day {r.day}: {r.score}/100 on {day(r.created_at)}</li>)}</ul>)}</section>

      <section aria-label="Certificates"><h3 className="text-sm font-semibold">Certificates</h3>
        <p className="mt-1 text-sm text-muted">{data.certificates.length ? data.certificates.map((c) => `Level ${c.level} (${day(c.issued_at)})`).join(", ") : "None yet"}</p></section>

      <section aria-label="AI usage this month"><h3 className="text-sm font-semibold">AI usage this month</h3>
        {data.ai_usage_month.length === 0 ? <p className="mt-1 text-sm text-muted">None</p> : (
          <ul className="mt-1 space-y-1 text-sm text-muted">{data.ai_usage_month.map((u) => <li key={u.kind}>{u.kind}: {u.calls} calls, ${u.cost_usd.toFixed(4)}</li>)}</ul>)}</section>

      <section aria-label="Change log"><h3 className="text-sm font-semibold">Change log</h3>
        {data.audit.length === 0 ? <p className="mt-1 text-sm text-muted">No admin changes</p> : (
          <ul className="mt-1 space-y-1 text-sm text-muted">{data.audit.map((a, i) => <li key={i}>{day(a.created_at)}: plan {a.detail.from} to {a.detail.to}</li>)}</ul>)}</section>
    </Card>
  );
}

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const list = useApi<UserList>(`/api/v1/admin/users?q=${encodeURIComponent(applied)}&limit=${PAGE}&offset=${offset}`);

  return (
    <section aria-label="Users" className="space-y-3">
      <h2 className="text-lg font-semibold">Users</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setOffset(0); setSelected(null); setApplied(q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email" aria-label="Search users by email" maxLength={100}
          className="min-h-11 flex-1 rounded-xl border border-line bg-black px-3 text-sm" />
        <Button type="submit" variant="ghost">Search</Button>
      </form>
      {list.error ? <LoadError status={list.error.status} onRetry={list.reload} /> : !list.data ? <Spinner /> : (
        <>
          <p className="text-xs text-muted">{list.data.total} users</p>
          <UsersList items={list.data.items} selected={selected} onSelect={setSelected} />
          <div className="flex items-center justify-between">
            <Button variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
            <Button variant="ghost" disabled={offset + PAGE >= list.data.total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
          </div>
        </>
      )}
      {selected && <UserDetail key={selected} id={selected} onChanged={list.reload} />}
    </section>
  );
}
