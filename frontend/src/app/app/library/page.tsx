"use client";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";

type Item = { id: string; title: string; tagline: string; category: string; free: boolean; locked: boolean };

export default function Library() {
  const { data, error, reload } = useApi<{ items: Item[] }>("/api/v1/library/architecture");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;
  const cats = ["All", ...Array.from(new Set(data.items.map((i) => i.category)))];
  const term = q.trim().toLowerCase();
  const shown = data.items.filter((i) => (cat === "All" || i.category === cat) && (!term || `${i.title} ${i.tagline}`.toLowerCase().includes(term)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Architecture Library</h1>
        <p className="mt-1 text-sm text-muted">The technology your projects run on, in business language. For each topic: what it is, what it does to your plan, what goes wrong, what to ask the engineers and how to say it in an interview.</p>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, for example gateway or backup" aria-label="Search the library"
        className="min-h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        {cats.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
            className={`min-h-9 rounded-full border px-3 text-sm ${cat === c ? "border-lime bg-lime text-black" : "border-line"}`}>{c}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-sm text-muted">Nothing matches. Try another word.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((i) => (
          <li key={i.id}>
            <Link href={`/app/library/${i.id}`} className="block h-full rounded-2xl border border-line bg-surface2 p-4 transition hover:border-violet">
              <span className="flex items-center justify-between gap-2">
                <Badge tone={i.free ? "lime" : "muted"}>{i.category}</Badge>
                {i.locked && <Lock aria-label="Full program" className="h-4 w-4 text-muted" />}
              </span>
              <span className="mt-2 block font-semibold text-white">{i.title}</span>
              <span className="mt-1 block text-sm text-muted">{i.tagline}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Card><p className="text-sm text-muted">Explainers are simplified on purpose. They teach the project manager&apos;s view, not engineering detail. Check your organisation&apos;s own standards before relying on them.</p></Card>
    </div>
  );
}
