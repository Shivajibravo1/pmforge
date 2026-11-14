"use client";
import Link from "next/link";
import { Badge, Card, LoadError, Spinner } from "@/components/ui";
import { type Curriculum, type Progress, TYPE_LABEL, useApi } from "@/lib/api";

export default function Course() {
  const cur = useApi<Curriculum>("/api/v1/curriculum");
  const prog = useApi<Progress>("/api/v1/progress");
  const failed = cur.error ?? prog.error;
  if (failed) return <LoadError status={failed.status} onRetry={() => { cur.reload(); prog.reload(); }} />;
  if (!cur.data || !prog.data) return <Spinner />;
  const done = new Set(prog.data.completed);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Course</h1>
      {cur.data.levels.map((lv) => {
        const phases = [...new Set(lv.days.map((d) => d.phase))];
        const count = lv.days.filter((d) => done.has(d.day)).length;
        return (
          <section key={lv.id} aria-labelledby={`lv${lv.id}`}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id={`lv${lv.id}`} className="text-lg font-semibold">Level {lv.id}: {lv.title}</h2>
              <span className="text-sm text-muted">{count}/30</span>
            </div>
            <div className="space-y-4">
              {phases.map((ph) => (
                <Card key={ph}>
                  <h3 className="mb-3 text-sm font-semibold text-lime">{ph}</h3>
                  <ul className="space-y-1">
                    {lv.days.filter((d) => d.phase === ph).map((d) => {
                      const unlocked = d.day === 1 || done.has(d.day - 1) || done.has(d.day);
                      const free = d.day <= cur.data!.free_lessons;
                      return (
                        <li key={d.day}>
                          <Link href={`/app/lesson/${d.day}`} aria-disabled={!unlocked}
                            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface2 ${unlocked ? "" : "opacity-50"}`}>
                            <span><span className="text-muted">{d.day}.</span> {d.title}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              <Badge>{TYPE_LABEL[d.type]}</Badge>
                              {done.has(d.day) ? <Badge tone="lime">Done</Badge> : !free ? <Badge tone="violet">Full</Badge> : null}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
