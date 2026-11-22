"use client";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { Badge, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";

type Item = { id: string; title: string; tagline: string; layout: string; free: boolean; locked: boolean };

export default function Templates() {
  const { data, error, reload } = useApi<{ items: Item[] }>("/api/v1/templates");
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/toolkit" aria-label="Back to Toolkit" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <h1 className="text-2xl font-bold">PM templates</h1>
      </div>
      <p className="text-sm text-muted">Fill in, keep a draft on this device, and download as a spreadsheet or copy as text. Each one shows a worked example, tips and common mistakes.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.items.map((i) => (
          <li key={i.id}>
            <Link href={`/app/templates/${i.id}`} className="block h-full rounded-2xl border border-line bg-surface2 p-4 transition hover:border-violet">
              <span className="flex items-center justify-between gap-2">
                <Badge tone={i.free ? "lime" : "muted"}>{i.layout === "table" ? "Table" : "Document"}</Badge>
                {i.locked && <Lock aria-label="Full program" className="h-4 w-4 text-muted" />}
              </span>
              <span className="mt-2 block font-semibold text-white">{i.title}</span>
              <span className="mt-1 block text-sm text-muted">{i.tagline}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
