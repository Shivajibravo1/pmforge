"use client";
import { Badge, Card, LinkButton, LoadError, Spinner } from "@/components/ui";
import { type Curriculum, type Progress, TYPE_LABEL, useApi } from "@/lib/api";

export default function Today() {
  const prog = useApi<Progress>("/api/v1/progress");
  const cur = useApi<Curriculum>("/api/v1/curriculum");
  const failed = prog.error ?? cur.error;
  if (failed) return <LoadError status={failed.status} onRetry={() => { prog.reload(); cur.reload(); }} />;
  if (!prog.data || !cur.data) return <Spinner />;

  const done = new Set(prog.data.completed);
  const all = cur.data.levels.flatMap((l) => l.days);
  const next = all.find((d) => !done.has(d.day));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card><p className="text-xs text-muted">Streak</p><p className="text-2xl font-bold text-lime">{prog.data.streak}</p></Card>
        <Card><p className="text-xs text-muted">XP</p><p className="text-2xl font-bold">{prog.data.total_xp}</p></Card>
        <Card><p className="text-xs text-muted">Done</p><p className="text-2xl font-bold">{done.size}<span className="text-sm text-muted"> / 120</span></p></Card>
      </div>
      {next ? (
        <Card>
          <div className="flex items-center gap-2"><Badge tone="violet">Day {next.day}</Badge><Badge>{TYPE_LABEL[next.type]}</Badge></div>
          <h1 className="mt-3 text-xl font-semibold">{next.title}</h1>
          <p className="mt-1 text-sm text-muted">{next.phase}</p>
          <div className="mt-5"><LinkButton href={`/app/lesson/${next.day}`} variant="lime">Start today&apos;s lesson</LinkButton></div>
        </Card>
      ) : (
        <Card><h1 className="text-xl font-semibold">Program complete</h1><p className="mt-2 text-sm text-muted">Open You to claim your certificates.</p></Card>
      )}
    </div>
  );
}
