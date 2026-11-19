"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, LoadError, Notice, Spinner } from "@/components/ui";
import { ApiError, api, friendly, useApi } from "@/lib/api";

type Tier = "paid" | "free";
type Member = { id: string; email: string; opted_in: boolean; paused: boolean; last_sent_on: string | null };
type Listing = { total: number; shown: number; counts: Record<Tier, number>; items: Member[] };
type SendResult = { requested: number; sent: number; failed: number; skipped: number };

const BATCH = 50;
const canSelect = (m: Member) => m.opted_in && !m.paused;

export function AdminSubscribers() {
  const [tier, setTier] = useState<Tier>("paid");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, reload } = useApi<Listing>(`/api/v1/admin/subscribers?tier=${tier}&q=${encodeURIComponent(term)}`);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const eligible = useMemo(() => (data?.items ?? []).filter(canSelect), [data]);
  const all = eligible.length > 0 && eligible.every((m) => picked.has(m.id));

  function toggle(id: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function send() {
    const ids = [...picked];
    if (ids.length === 0) return;
    setBusy(true);
    setMsg("");
    const total: SendResult = { requested: 0, sent: 0, failed: 0, skipped: 0 };
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const r = await api<SendResult>("/api/v1/admin/subscribers/send", { method: "POST", body: { user_ids: ids.slice(i, i + BATCH) } });
        total.requested += r.requested; total.sent += r.sent; total.failed += r.failed; total.skipped += r.skipped;
      }
      setMsg(`Sent to ${total.sent} of ${total.requested}.` + (total.skipped ? ` ${total.skipped} skipped (already emailed today, paused or over today's limit).` : "")
        + (total.failed ? ` ${total.failed} failed and will retry at the next daily run.` : ""));
      setPicked(new Set());
      await reload();
    } catch (e) {
      setMsg(`${friendly(e as ApiError)}${total.sent ? ` Sent to ${total.sent} before it stopped.` : ""}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/app/admin" aria-label="Back to Admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold">Subscribers</h1>
      </div>
      <p className="text-sm text-muted">
        Send today&apos;s interview email to chosen members now. Only members who opted in can be chosen, and each member gets at most one email a day.
      </p>

      <div role="tablist" aria-label="Plan" className="flex gap-2">
        {(["paid", "free"] as Tier[]).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tier === t} onClick={() => { setTier(t); setPicked(new Set()); }}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${tier === t ? "border-lime bg-surface2" : "border-line text-muted"}`}>
            {t === "paid" ? "Paid" : "Free"}{data ? ` (${data.counts[t]})` : ""}
          </button>
        ))}
      </div>

      <input value={q} onChange={(e) => { setQ(e.target.value); setPicked(new Set()); }} maxLength={100} placeholder="Search by email" aria-label="Search by email"
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm" />

      {error ? <LoadError status={error.status} onRetry={reload} /> : !data ? <Spinner /> : (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={all} disabled={eligible.length === 0}
                onChange={() => setPicked(all ? new Set() : new Set(eligible.map((m) => m.id)))} />
              Select all who opted in ({eligible.length})
            </label>
            <Button disabled={busy || picked.size === 0} onClick={send}>
              {busy ? "Sending" : `Send to ${picked.size} selected`}
            </Button>
          </div>
          {msg && <Notice>{msg}</Notice>}
          {data.items.length === 0 ? <p className="text-sm text-muted">No members here.</p> : (
            <ul className="divide-y divide-line">
              {data.items.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" aria-label={`Select ${m.email || m.id}`} checked={picked.has(m.id)} disabled={!canSelect(m)}
                    onChange={() => toggle(m.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-all text-sm font-medium">{m.email || m.id}</span>
                    <span className="block text-xs text-muted">{m.last_sent_on ? `Last email ${m.last_sent_on}` : "No email sent yet"}</span>
                  </span>
                  {m.paused ? <Badge>Paused</Badge> : m.opted_in ? <Badge tone="lime">Opted in</Badge> : <Badge>Not opted in</Badge>}
                </li>
              ))}
            </ul>
          )}
          {data.total > data.shown && <p className="text-xs text-muted">Showing {data.shown} of {data.total}. Search to find others.</p>}
        </Card>
      )}
    </div>
  );
}
