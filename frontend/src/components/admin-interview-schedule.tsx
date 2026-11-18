"use client";
import { useState } from "react";
import { Button, Card, Notice } from "@/components/ui";
import { type ResourceItem } from "@/lib/resources";
import { ApiError, api, friendly, useApi } from "@/lib/api";

type Q = { send_on: string; question: string; tips: string[]; lesson_day: number | null; resource_id: string | null };

export function AdminInterviewSchedule() {
  const list = useApi<{ items: Q[] }>("/api/v1/admin/interview-questions");
  const res = useApi<{ items: ResourceItem[] }>("/api/v1/resources");
  const [date, setDate] = useState("");
  const [question, setQuestion] = useState("");
  const [tips, setTips] = useState("");
  const [rid, setRid] = useState("");
  const [msg, setMsg] = useState("");
  const usable = (res.data?.items ?? []).filter((r) => r.kind === "pdf" || r.in_email);

  async function save() {
    setMsg("");
    if (!date) return setMsg("Pick a send date.");
    if (question.trim().length < 10) return setMsg("Write the question (at least 10 characters).");
    try {
      await api(`/api/v1/admin/interview-questions/${date}`, {
        method: "PUT",
        body: { question, tips: tips.split("\n"), resource_id: rid || null },
      });
      setQuestion("");
      setTips("");
      setRid("");
      setMsg(`Scheduled for ${date}.`);
      await list.reload();
    } catch (e) {
      setMsg(friendly(e instanceof ApiError ? e : null));
    }
  }

  async function remove(d: string) {
    await api(`/api/v1/admin/interview-questions/${d}`, { method: "DELETE" });
    await list.reload();
  }

  const field = "min-h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm";
  return (
    <Card>
      <h2 className="font-semibold">Daily interview emails</h2>
      <p className="mt-1 text-sm text-muted">Write the question for a date. Dates you leave empty use the built-in question bank. Emails go out from 7:00 India time.</p>
      <div className="mt-3 space-y-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Send date" className={field} />
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} aria-label="Question" maxLength={600} rows={3} placeholder="Interview question" className={`${field} py-2`} />
        <textarea value={tips} onChange={(e) => setTips(e.target.value)} aria-label="Tips" rows={3} placeholder="Strong answer points, one per line (optional)" className={`${field} py-2`} />
        <select value={rid} onChange={(e) => setRid(e.target.value)} aria-label="Image or PDF" className={field}>
          <option value="">No image or PDF</option>
          {usable.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.kind === "pdf" ? "PDF link" : "image in email"})</option>)}
        </select>
        <Button onClick={save}>Schedule</Button>
      </div>
      {msg && <div className="mt-3"><Notice>{msg}</Notice></div>}
      <ul className="mt-4 divide-y divide-line">
        {list.data?.items.map((q) => (
          <li key={q.send_on} className="flex items-start justify-between gap-3 py-2 text-sm">
            <span><strong>{q.send_on}</strong> {q.question}</span>
            <Button variant="ghost" onClick={() => remove(q.send_on)}>Remove</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
