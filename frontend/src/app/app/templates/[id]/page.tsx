"use client";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, LinkButton, LoadError, Notice, Spinner } from "@/components/ui";
import { UpgradeOptions } from "@/components/upgrade-options";
import { type Me, useApi } from "@/lib/api";
import { type Col, type Row, computed, raciProblems, toCsv } from "@/lib/templates";

type Detail = {
  id: string; title: string; tagline: string; layout: "table" | "doc"; purpose: string; when: string;
  columns: Col[]; example: Row[]; tips: string[]; mistakes: string[]; check: string | null;
};

const blank = (cols: Col[]): Row => Object.fromEntries(cols.map((c) => [c.key, ""]));
const draftKey = (id: string) => `pmforge.template.${id}`;

function initialRows(t: Detail): Row[] {
  try {
    const raw = localStorage.getItem(draftKey(t.id));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((r) => r && typeof r === "object")) return parsed as Row[];
    }
  } catch { /* storage can be blocked or hold old data */ }
  if (t.layout === "doc") return t.example.map((r) => ({ ...blank(t.columns), section: r.section ?? "" }));
  return [blank(t.columns), blank(t.columns), blank(t.columns)];
}

const list = (items: string[]) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

function Editor({ t }: { t: Detail }) {
  const [rows, setRows] = useState<Row[]>(() => initialRows(t));
  const [note, setNote] = useState("");
  const [showEx, setShowEx] = useState(false);
  const isDoc = t.layout === "doc";

  function update(next: Row[]) {
    setRows(next);
    try { localStorage.setItem(draftKey(t.id), JSON.stringify(next)); } catch { /* draft not kept */ }
  }
  const set = (i: number, key: string, v: string) => update(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  function download() {
    const url = URL.createObjectURL(new Blob(["﻿" + toCsv(t.columns, rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function copy() {
    const text = rows.map((r) => t.columns.map((c) => `${c.label}: ${computed(c, r) ?? r[c.key] ?? ""}`).join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(text); setNote("Copied."); } catch { setNote("Copy is blocked here. Use Download instead."); }
  }
  const problems = t.check === "raci" ? raciProblems(t.columns, rows) : [];

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-semibold">What it is for</h2><p className="mt-1 text-sm">{t.purpose}</p>
        <h2 className="mt-3 font-semibold">When to use it</h2><p className="mt-1 text-sm">{t.when}</p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Your {t.title}</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={download}><Download size={16} aria-hidden="true" /> Download</Button>
            <Button variant="ghost" onClick={copy}>Copy as text</Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">Your draft is kept on this device only. Do not enter passwords or personal data.</p>
        {note && <p role="status" className="mt-2 text-sm">{note}</p>}

        {isDoc ? (
          <div className="mt-3 space-y-3">
            {rows.map((r, i) => (
              <label key={i} className="block text-sm">
                <span className="font-medium">{r.section}</span>
                <textarea value={r.content ?? ""} rows={3} maxLength={2000} onChange={(e) => set(i, "content", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-surface2 px-3 py-2 text-sm" />
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
              <thead><tr>{t.columns.map((c) => <th key={c.key} scope="col" className="px-1 text-left font-medium" title={c.hint}>{c.label}</th>)}<th className="w-10"><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {t.columns.map((c) => {
                      const calc = computed(c, r);
                      return (
                        <td key={c.key}>
                          {calc !== null
                            ? <output aria-label={`${c.label} row ${i + 1}`} className="block px-2 font-semibold">{calc}</output>
                            : <input value={r[c.key] ?? ""} maxLength={500} onChange={(e) => set(i, c.key, e.target.value)} placeholder={c.hint}
                                aria-label={`${c.label} row ${i + 1}`} inputMode={c.kind === "number" ? "numeric" : undefined}
                                className="min-h-10 w-full rounded-lg border border-line bg-surface2 px-2" />}
                        </td>
                      );
                    })}
                    <td><button type="button" aria-label={`Remove row ${i + 1}`} disabled={rows.length <= 1} onClick={() => update(rows.filter((_, j) => j !== i))}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-line disabled:opacity-40"><Trash2 size={16} aria-hidden="true" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2"><Button variant="ghost" disabled={rows.length >= 100} onClick={() => update([...rows, blank(t.columns)])}><Plus size={16} aria-hidden="true" /> Add row</Button></div>
          </div>
        )}
        {problems.length > 0 && <Notice>Each activity needs exactly one A (accountable). Check: {problems.join(", ")}.</Notice>}
      </Card>

      <Card>
        <button type="button" aria-expanded={showEx} onClick={() => setShowEx((v) => !v)} className="min-h-11 w-full text-left font-semibold">
          {showEx ? "Hide" : "Show"} a worked example (Nimbus, illustrative)
        </button>
        {showEx && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr>{t.columns.map((c) => <th key={c.key} scope="col" className="p-1 font-medium">{c.label}</th>)}</tr></thead>
              <tbody>{t.example.map((r, i) => <tr key={i} className="border-t border-line align-top">{t.columns.map((c) => <td key={c.key} className="p-1">{computed(c, r) ?? r[c.key]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><h2 className="font-semibold">Tips</h2>{list(t.tips)}</Card>
        <Card><h2 className="font-semibold">Common mistakes</h2>{list(t.mistakes)}</Card>
      </div>
    </div>
  );
}

export default function TemplatePage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useApi<Detail>(`/api/v1/templates/${encodeURIComponent(id)}`);
  const me = useApi<Me>("/api/v1/me");
  const back = (
    <Link href="/app/templates" aria-label="Back to templates" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2"><ArrowLeft size={20} aria-hidden="true" /></Link>
  );
  if (error?.status === 402) {
    return (
      <div className="space-y-4">{back}
        <Card><Badge tone="violet">Full program</Badge>
          <h1 className="mt-3 text-xl font-semibold">This template is part of the full program</h1>
          {me.data && <div className="mt-4"><UpgradeOptions email={me.data.email} /></div>}
          <div className="mt-4"><LinkButton href="/app/templates" variant="ghost">Back to templates</LinkButton></div>
        </Card>
      </div>
    );
  }
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">{back}<div><h1 className="text-2xl font-bold">{data.title}</h1><p className="text-sm text-muted">{data.tagline}</p></div></div>
      <Editor t={data} />
    </div>
  );
}
