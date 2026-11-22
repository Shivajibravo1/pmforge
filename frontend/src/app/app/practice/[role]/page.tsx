"use client";
import { ArrowLeft, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";

type Q = { id: string; type: string; question: string; time_seconds: number; locked: boolean; best_score: number | null };

export default function RoleQuestions() {
  const { role } = useParams<{ role: string }>();
  const { data, error, reload } = useApi<{ items: Q[] }>(`/api/v1/practice/questions?role=${encodeURIComponent(role)}`);
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/practice" aria-label="Back to Interview practice" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <h1 className="text-2xl font-bold">Choose a question</h1>
      </div>
      <ul className="space-y-3">
        {data.items.map((q) => (
          <li key={q.id}>
            <Link href={`/app/practice/q/${q.id}`} className="block rounded-2xl border border-line bg-surface2 p-4 transition hover:border-violet">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone={q.locked ? "muted" : "lime"}>{q.type}</Badge>
                <span className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><Clock aria-hidden className="h-3.5 w-3.5" />{Math.round(q.time_seconds / 60 * 10) / 10} min</span>
                  {q.best_score !== null && <span>Best {q.best_score}</span>}
                  {q.locked && <Lock aria-label="Full program" className="h-4 w-4" />}
                </span>
              </span>
              <span className="mt-2 block text-sm text-white">{q.question}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
