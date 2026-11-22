"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";

type Role = { id: string; title: string; blurb: string; questions: number; free: number };
type Hist = { items: { id: string; question_id: string; self_score: number; ai_score: number | null; created_at: string }[] };

export default function Practice() {
  const { data, error, reload } = useApi<{ roles: Role[] }>("/api/v1/practice/roles");
  const hist = useApi<Hist>("/api/v1/practice/history");
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;
  const tries = hist.data?.items ?? [];
  const avg = tries.length ? Math.round(tries.reduce((a, t) => a + t.self_score, 0) / tries.length) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/toolkit" aria-label="Back to Toolkit" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <h1 className="text-2xl font-bold">Interview practice</h1>
      </div>
      <p className="text-sm text-muted">Pick a role. Each question is timed. Write your answer, check it against the rubric, then compare with a model answer. AI feedback is optional and uses your daily review allowance.</p>
      <ul className="grid gap-3">
        {data.roles.map((r) => (
          <li key={r.id}>
            <Link href={`/app/practice/${r.id}`} className="block rounded-2xl border border-line bg-surface2 p-4 transition hover:border-violet">
              <span className="block font-semibold text-white">{r.title}</span>
              <span className="mt-1 block text-sm text-muted">{r.blurb}</span>
              <span className="mt-2 block text-xs text-muted">{r.questions} questions, {r.free} free</span>
            </Link>
          </li>
        ))}
      </ul>
      {tries.length > 0 && <Card><p className="text-sm">You have practised {tries.length} {tries.length === 1 ? "answer" : "answers"} recently. Average self check score: <span className="font-semibold">{avg}</span> out of 100.</p></Card>}
    </div>
  );
}
