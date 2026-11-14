"use client";
import { useState } from "react";
import { Button, Card, Notice, LoadError, Spinner } from "@/components/ui";
import { type Curriculum, type Progress, api, friendly, useApi, ApiError } from "@/lib/api";

type Turn = { role: "you" | "mentor"; text: string };

export default function Mentor() {
  const prog = useApi<Progress>("/api/v1/progress");
  const cur = useApi<Curriculum>("/api/v1/curriculum");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const failed = prog.error ?? cur.error;
  if (failed) return <LoadError status={failed.status} onRetry={() => { prog.reload(); cur.reload(); }} />;
  if (!prog.data || !cur.data) return <Spinner />;

  const done = new Set(prog.data.completed);
  const all = cur.data.levels.flatMap((l) => l.days);
  const current = all.find((d) => !done.has(d.day)) ?? all[all.length - 1];

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setBusy(true);
    setMsg("");
    setTurns((t) => [...t, { role: "you", text: q }]);
    setText("");
    try {
      const r = await api<{ reply: string }>("/api/v1/mentor/chat", { method: "POST", body: { day: current.day, message: q } });
      setTurns((t) => [...t, { role: "mentor", text: r.reply }]);
    } catch (err) {
      setMsg(friendly(err as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mentor</h1>
      <p className="text-sm text-muted">Context: Day {current.day}, {current.title}</p>
      <p className="text-xs text-muted">Do not share passwords, personal data or confidential client information. The mentor is an AI and can be wrong, so verify important answers.</p>
      <div className="space-y-3" aria-live="polite">
        {turns.map((t, i) => (
          <Card key={i} className={t.role === "you" ? "bg-surface2" : ""}>
            <p className="mb-1 text-xs font-semibold text-lime">{t.role === "you" ? "You" : "Mentor"}</p>
            <p className="whitespace-pre-wrap text-sm">{t.text}</p>
          </Card>
        ))}
      </div>
      {msg && <Notice>{msg}</Notice>}
      <form onSubmit={send} className="space-y-3">
        <label htmlFor="q" className="block text-sm">Ask about this lesson or your capstone</label>
        <textarea id="q" rows={3} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-line bg-black p-3 text-sm text-white" />
        <Button type="submit" disabled={busy || !text.trim()}>Send</Button>
      </form>
    </div>
  );
}
