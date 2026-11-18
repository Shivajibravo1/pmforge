"use client";
import { ArrowDown, ArrowUp, Image as ImageIcon, Paperclip, Trash2, Type } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Button, Card, Notice } from "@/components/ui";
import { ApiError, api, apiUpload, friendly, useApi } from "@/lib/api";
import type { ResourceItem } from "@/lib/resources";

export type Blk = { type: "text" | "image"; text?: string; resource_id?: string | null };
export type Email = { id: string; subject: string; blocks: Blk[]; attachment_id: string | null; send_on: string | null; send_hour: number; status: string };
type Draft = { id: string | null; subject: string; blocks: (Blk & { key: number })[]; attachment_id: string; send_on: string; send_hour: number; status: string };

let counter = 0;
const withKeys = (b: Blk[]) => b.map((x) => ({ ...x, key: ++counter }));
const blank = (): Draft => ({ id: null, subject: "", blocks: withKeys([{ type: "text", text: "" }]), attachment_id: "", send_on: "", send_hour: 7, status: "draft" });
const field = "min-h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm";
const TONE = { draft: "muted", scheduled: "violet", sent: "lime", partial: "muted" } as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function EmailComposer() {
  const list = useApi<{ items: Email[] }>("/api/v1/admin/emails");
  const res = useApi<{ items: ResourceItem[] }>("/api/v1/resources");
  const [d, setD] = useState<Draft | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const imgFile = useRef<HTMLInputElement>(null);
  const pdfFile = useRef<HTMLInputElement>(null);
  const images = (res.data?.items ?? []).filter((r) => r.kind === "image" && r.in_email);
  const pdfs = (res.data?.items ?? []).filter((r) => r.kind === "pdf");
  const locked = d ? d.status === "sent" || d.status === "partial" : false;

  const fail = (e: unknown) => setMsg(e instanceof ApiError && e.status === 413 ? "That file is larger than 5 MB." : friendly(e instanceof ApiError ? e : null));
  const patch = (p: Partial<Draft>) => setD((x) => (x ? { ...x, ...p } : x));
  const setBlock = (key: number, p: Partial<Blk>) => setD((x) => (x ? { ...x, blocks: x.blocks.map((b) => (b.key === key ? { ...b, ...p } : b)) } : x));
  const move = (i: number, by: number) => setD((x) => {
    if (!x) return x;
    const j = i + by;
    if (j < 0 || j >= x.blocks.length) return x;
    const b = [...x.blocks];
    [b[i], b[j]] = [b[j], b[i]];
    return { ...x, blocks: b };
  });

  function open(e: Email) {
    setMsg("");
    setD({ id: e.id, subject: e.subject, blocks: withKeys(e.blocks), attachment_id: e.attachment_id ?? "", send_on: e.send_on ?? "", send_hour: e.send_hour, status: e.status });
  }

  const payload = (x: Draft) => ({
    subject: x.subject,
    blocks: x.blocks.map((b) => ({ type: b.type, text: b.text, resource_id: b.resource_id })),
    attachment_id: x.attachment_id || null,
    send_on: x.send_on || null,
    send_hour: x.send_hour,
  });

  async function save(): Promise<Email | null> {
    if (!d) return null;
    if (d.subject.trim().length < 3) { setMsg("Write a subject of at least 3 characters."); return null; }
    try {
      const saved = d.id ? await api<Email>(`/api/v1/admin/emails/${d.id}`, { method: "PUT", body: payload(d) })
        : await api<Email>("/api/v1/admin/emails", { method: "POST", body: payload(d) });
      patch({ id: saved.id, status: saved.status });
      await list.reload();
      return saved;
    } catch (e) { fail(e); return null; }
  }

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg("");
    try { await fn(); setMsg(label); } catch (e) { fail(e); } finally { setBusy(false); }
  }

  const saveDraft = () => run("Saved.", async () => { if (!(await save())) throw new ApiError(0, "silent"); });
  const schedule = () => run("Scheduled. It will be sent on the chosen date and hour (India time).", async () => {
    const s = await save();
    if (!s) throw new ApiError(0, "silent");
    const out = await api<Email>(`/api/v1/admin/emails/${s.id}/schedule`, { method: "POST" });
    patch({ status: out.status });
    await list.reload();
  });
  const unschedule = () => run("Back to draft.", async () => {
    const out = await api<Email>(`/api/v1/admin/emails/${d!.id}/unschedule`, { method: "POST" });
    patch({ status: out.status });
    await list.reload();
  });
  const test = () => run("Test email sent to your own address.", async () => {
    const s = await save();
    if (!s) throw new ApiError(0, "silent");
    await api(`/api/v1/admin/emails/${s.id}/test`, { method: "POST" });
  });
  const remove = (e: Email) => run("Deleted.", async () => {
    await api(`/api/v1/admin/emails/${e.id}`, { method: "DELETE" });
    if (d?.id === e.id) setD(null);
    await list.reload();
  });

  async function addImage(f: File | undefined) {
    if (!f) return;
    await run("Image added.", async () => {
      const r = await apiUpload<ResourceItem>(`/api/v1/admin/resources?title=${encodeURIComponent(f.name.replace(/\.[^.]+$/, "").slice(0, 100).padEnd(3, "_"))}&in_email=true`, f);
      await res.reload();
      setD((x) => (x ? { ...x, blocks: [...x.blocks, ...withKeys([{ type: "image", resource_id: r.id }])] } : x));
    });
    if (imgFile.current) imgFile.current.value = "";
  }

  async function addPdf(f: File | undefined) {
    if (!f) return;
    await run("PDF attached.", async () => {
      const r = await apiUpload<ResourceItem>(`/api/v1/admin/resources?title=${encodeURIComponent(f.name.replace(/\.[^.]+$/, "").slice(0, 100).padEnd(3, "_"))}&in_email=false`, f);
      await res.reload();
      patch({ attachment_id: r.id });
    });
    if (pdfFile.current) pdfFile.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email composer</h1>
        <Button onClick={() => { setMsg(""); setD(blank()); }}>New email</Button>
      </div>
      <p className="text-sm text-muted">Emails go to members who turned on the daily email on their You page. A scheduled email replaces that day&apos;s interview question, so nobody gets two emails in a day. Times are India time.</p>
      {msg && <Notice>{msg}</Notice>}

      {d && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{d.id ? "Edit email" : "New email"}</h2>
            <Badge tone={TONE[d.status as keyof typeof TONE] ?? "muted"}>{d.status}</Badge>
          </div>
          <fieldset disabled={locked || busy} className="mt-3 space-y-3">
            <input value={d.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="Subject" aria-label="Subject" maxLength={150} className={field} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={d.send_on} onChange={(e) => patch({ send_on: e.target.value })} aria-label="Send date" className={field} />
              <select value={d.send_hour} onChange={(e) => patch({ send_hour: Number(e.target.value) })} aria-label="Send hour" className={field}>
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00 IST</option>)}
              </select>
            </div>

            {d.blocks.map((b, i) => (
              <div key={b.key} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>{b.type === "text" ? "Text" : "Image"}</span>
                  <span className="flex gap-1">
                    <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="min-h-9 min-w-9"><ArrowUp aria-hidden className="mx-auto h-4 w-4" /></button>
                    <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="min-h-9 min-w-9"><ArrowDown aria-hidden className="mx-auto h-4 w-4" /></button>
                    <button type="button" aria-label="Remove block" onClick={() => patch({ blocks: d.blocks.filter((x) => x.key !== b.key) })} className="min-h-9 min-w-9"><Trash2 aria-hidden className="mx-auto h-4 w-4" /></button>
                  </span>
                </div>
                {b.type === "text" ? (
                  <textarea value={b.text ?? ""} onChange={(e) => setBlock(b.key, { text: e.target.value })} rows={5} maxLength={5000} aria-label="Text"
                    placeholder={"Write your paragraph here.\nLeave a blank line to start a new paragraph.\n- Start a line with a dash for a bullet"} className={`${field} py-2`} />
                ) : (
                  <select value={b.resource_id ?? ""} onChange={(e) => setBlock(b.key, { resource_id: e.target.value })} aria-label="Image" className={field}>
                    <option value="">Choose an image</option>
                    {images.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => patch({ blocks: [...d.blocks, ...withKeys([{ type: "text", text: "" }])] })}><Type aria-hidden className="mr-1 inline h-4 w-4" />Add text</Button>
              <Button variant="ghost" onClick={() => imgFile.current?.click()}><ImageIcon aria-hidden className="mr-1 inline h-4 w-4" />Upload image</Button>
              <Button variant="ghost" onClick={() => patch({ blocks: [...d.blocks, ...withKeys([{ type: "image", resource_id: "" }])] })}>Add uploaded image</Button>
              <input ref={imgFile} type="file" accept="image/png,image/jpeg" hidden aria-label="Image file" onChange={(e) => addImage(e.target.files?.[0])} />
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 flex items-center gap-1 text-sm font-medium"><Paperclip aria-hidden className="h-4 w-4" />PDF attachment</p>
              <select value={d.attachment_id} onChange={(e) => patch({ attachment_id: e.target.value })} aria-label="PDF attachment" className={field}>
                <option value="">No attachment</option>
                {pdfs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              <div className="mt-2"><Button variant="ghost" onClick={() => pdfFile.current?.click()}>Upload a new PDF</Button></div>
              <input ref={pdfFile} type="file" accept="application/pdf" hidden aria-label="PDF file" onChange={(e) => addPdf(e.target.files?.[0])} />
            </div>
          </fieldset>

          {locked ? <p className="mt-3 text-sm text-muted">This email was already sent and can no longer be changed.</p> : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={saveDraft}>Save draft</Button>
              {d.status === "scheduled"
                ? <><Button disabled={busy} onClick={schedule}>Save changes</Button><Button variant="ghost" disabled={busy} onClick={unschedule}>Unschedule</Button></>
                : <Button disabled={busy} onClick={schedule}>Schedule</Button>}
              <Button variant="ghost" disabled={busy} onClick={test}>Send test to me</Button>
              <Button variant="ghost" onClick={() => setD(null)}>Close</Button>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Your emails</h2>
        {list.data?.items.length === 0 && <p className="mt-2 text-sm text-muted">No emails yet. Click New email.</p>}
        <ul className="mt-2 divide-y divide-line">
          {list.data?.items.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <button type="button" onClick={() => open(e)} className="min-w-0 text-left">
                <span className="block truncate font-medium">{e.subject}</span>
                <span className="text-xs text-muted">{e.send_on ? `${e.send_on} ${String(e.send_hour).padStart(2, "0")}:00 IST` : "No date yet"}</span>
              </button>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone={TONE[e.status as keyof typeof TONE] ?? "muted"}>{e.status}</Badge>
                {e.status !== "scheduled" && <Button variant="ghost" onClick={() => remove(e)}>Delete</Button>}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
