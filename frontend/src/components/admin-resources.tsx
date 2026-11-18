"use client";
import { useRef, useState } from "react";
import { Button, Card, Notice } from "@/components/ui";
import { type ResourceItem, kb } from "@/lib/resources";
import { ApiError, api, apiUpload, friendly, useApi } from "@/lib/api";

const MAX = 5 * 1024 * 1024;

export function AdminResources() {
  const list = useApi<{ items: ResourceItem[] }>("/api/v1/resources");
  const file = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [inEmail, setInEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload() {
    const f = file.current?.files?.[0];
    if (!f) return setMsg("Choose a PDF, PNG or JPG file first.");
    if (f.size > MAX) return setMsg("That file is larger than 5 MB.");
    if (title.trim().length < 3) return setMsg("Give it a title of at least 3 characters.");
    setBusy(true);
    setMsg("");
    try {
      await apiUpload(`/api/v1/admin/resources?title=${encodeURIComponent(title.trim())}&in_email=${inEmail}`, f);
      setTitle("");
      setInEmail(false);
      if (file.current) file.current.value = "";
      setMsg("Uploaded.");
      await list.reload();
    } catch (e) {
      setMsg(e instanceof ApiError && e.status === 413 ? "That file is larger than 5 MB." : friendly(e instanceof ApiError ? e : null));
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: ResourceItem) {
    setMsg("");
    try {
      await api(`/api/v1/admin/resources/${r.id}`, { method: "DELETE" });
      await list.reload();
    } catch (e) {
      setMsg(friendly(e instanceof ApiError ? e : null));
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Resources</h2>
      <p className="mt-1 text-sm text-muted">Members see these on the Resources page. PDF, PNG or JPG, up to 5 MB.</p>
      <div className="mt-3 space-y-2">
        <input ref={file} type="file" accept="application/pdf,image/png,image/jpeg" aria-label="File" className="block w-full text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" maxLength={120}
          className="min-h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm" />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={inEmail} onChange={(e) => setInEmail(e.target.checked)} />
          <span>Use in emails (images only). This gives the image a public link so email apps can show it.</span>
        </label>
        <Button disabled={busy} onClick={upload}>Upload</Button>
      </div>
      {msg && <div className="mt-3"><Notice>{msg}</Notice></div>}
      <ul className="mt-4 divide-y divide-line">
        {list.data?.items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate">{r.title} <span className="text-muted">({r.kind === "pdf" ? "PDF" : "image"}, {kb(r.size)}{r.in_email ? ", email" : ""})</span></span>
            <Button variant="ghost" onClick={() => remove(r)}>Delete</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
