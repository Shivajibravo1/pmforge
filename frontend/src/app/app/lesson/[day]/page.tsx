"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LessonPlayer } from "@/components/lesson-player";
import { Badge, Button, Card, LinkButton, Notice, Spinner } from "@/components/ui";
import { ApiError, type Lesson, type ReviewOut, TYPE_LABEL, api, friendly, useApi } from "@/lib/api";

const ARTIFACT_TYPES = ["B", "S", "K", "P", "A"];

export default function LessonPage() {
  const { day } = useParams<{ day: string }>();
  const n = Number(day);
  const { data: lesson, error, loading, reload } = useApi<Lesson>(Number.isInteger(n) ? `/api/v1/lessons/${n}` : null);
  const [text, setText] = useState("");
  const [review, setReview] = useState<ReviewOut | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (loading) return <Spinner />;
  if (error?.status === 402) {
    return (
      <Card>
        <Badge tone="violet">Full program</Badge>
        <h1 className="mt-3 text-xl font-semibold">Day {n} is part of the full program</h1>
        <p className="mt-2 text-sm text-muted">The first lessons are free. Paid access opens in a later release. In this test build, an admin can switch your tier.</p>
        <div className="mt-4"><LinkButton href="/app/course" variant="ghost">Back to course</LinkButton></div>
      </Card>
    );
  }
  if (error || !lesson) {
    return (
      <Card>
        <Notice>{friendly(error)}</Notice>
        <div className="mt-4"><LinkButton href="/app/course" variant="ghost">Back to course</LinkButton></div>
      </Card>
    );
  }

  const takesArtifact = ARTIFACT_TYPES.includes(lesson.type);

  async function submitAndReview() {
    setBusy(true);
    setMsg("");
    try {
      const a = await api<{ artifact_id: string }>(`/api/v1/lessons/${n}/artifact`, { method: "POST", body: { content: text } });
      setReview(await api<ReviewOut>(`/api/v1/artifacts/${a.artifact_id}/review`, { method: "POST" }));
    } catch (e) {
      setMsg(e instanceof ApiError && e.status === 422 ? "Write at least a few sentences before requesting a review." : friendly(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/v1/lessons/${n}/complete`, { method: "POST" });
      setCompleted(true);
      void reload();
    } catch (e) {
      setMsg(friendly(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  const finale = (
    <div className="space-y-5">
      {takesArtifact && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Your artifact</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{lesson.rubric.map((r) => <li key={r}>{r}</li>)}</ul>
          <label htmlFor="artifact" className="block text-sm">Write or paste your work</label>
          <textarea id="artifact" rows={9} maxLength={8000} value={text} onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-line bg-black p-3 text-sm text-white" />
          <Button onClick={submitAndReview} disabled={busy || text.trim().length < 20}>Get mentor review</Button>
          {review && (
            <div className="space-y-3 rounded-xl border border-line p-4" aria-live="polite">
              <p className="text-lg font-bold text-lime">Score {review.score}/100</p>
              {([["Strengths", review.strengths], ["Gaps", review.gaps], ["Next steps", review.next_steps]] as const).map(([h, items]) => (
                <div key={h}><h3 className="text-sm font-semibold">{h}</h3><ul className="list-disc pl-5 text-sm text-muted">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
              ))}
            </div>
          )}
        </Card>
      )}
      {msg && <Notice>{msg}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button variant="lime" onClick={complete} disabled={busy || completed}>{completed ? "Completed" : "Mark complete"}</Button>
        {completed && <LinkButton href={`/app/lesson/${n + 1}`} variant="ghost">Next lesson</LinkButton>}
        <Link href="/app/mentor" className="inline-flex min-h-11 items-center px-3 text-sm underline">Ask the mentor</Link>
      </div>
    </div>
  );

  return (
    <article className="space-y-5">
      <div className="flex items-center gap-2"><Badge tone="violet">Day {lesson.day}</Badge><Badge>{TYPE_LABEL[lesson.type]}</Badge></div>
      <h1 className="text-2xl font-bold">{lesson.title}</h1>
      <p className="text-sm text-muted">{lesson.phase}</p>

      {lesson.body ? (
        <LessonPlayer day={lesson.day} body={lesson.body} finale={finale} />
      ) : (
        <Card><p className="text-sm text-muted">The content for this lesson has not been published yet.</p></Card>
      )}
    </article>
  );
}
