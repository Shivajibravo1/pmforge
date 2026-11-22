"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, LinkButton, LoadError, Notice, Spinner } from "@/components/ui";
import { UpgradeOptions } from "@/components/upgrade-options";
import { ApiError, type Me, type ReviewOut, api, friendly, useApi } from "@/lib/api";

type Q = { id: string; role: string; type: string; question: string; time_seconds: number; rubric: string[] };
type Done = { attempt_id: string; self_score: number; model_answer: string };

const clock = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export default function PracticeQuestion() {
  const { id } = useParams<{ id: string }>();
  const { data: q, error, reload } = useApi<Q>(`/api/v1/practice/questions/${encodeURIComponent(id)}`);
  const me = useApi<Me>("/api/v1/me");
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  const [used, setUsed] = useState(0);
  const [stage, setStage] = useState<"write" | "check" | "done">("write");
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [res, setRes] = useState<Done | null>(null);
  const [fb, setFb] = useState<ReviewOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function start() {
    setStarted(true);
    timer.current = setInterval(() => setUsed((u) => u + 1), 1000);
  }
  function finish() {
    if (timer.current) clearInterval(timer.current);
    setTicks(new Array(q?.rubric.length ?? 0).fill(false));
    setStage("check");
  }
  async function save() {
    if (!q) return;
    setBusy(true);
    setMsg("");
    try {
      setRes(await api<Done>(`/api/v1/practice/questions/${q.id}/attempt`, { method: "POST", body: { answer: text, seconds_used: Math.min(used, 3600), ticks } }));
      setStage("done");
    } catch (e) {
      setMsg(e instanceof ApiError && e.status === 422 ? "Write a few sentences first." : friendly(e instanceof ApiError ? e : null));
    } finally { setBusy(false); }
  }
  async function askAi() {
    if (!res) return;
    setBusy(true);
    setMsg("");
    try { setFb(await api<ReviewOut>(`/api/v1/practice/attempts/${res.attempt_id}/feedback`, { method: "POST" })); }
    catch (e) { setMsg(friendly(e instanceof ApiError ? e : null)); }
    finally { setBusy(false); }
  }

  const back = (
    <Link href={q ? `/app/practice/${q.role}` : "/app/practice"} aria-label="Back to questions" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2"><ArrowLeft size={20} aria-hidden="true" /></Link>
  );
  if (error?.status === 402) {
    return (
      <div className="space-y-4">{back}
        <Card><Badge tone="violet">Full program</Badge>
          <h1 className="mt-3 text-xl font-semibold">This question is part of the full program</h1>
          {me.data && <div className="mt-4"><UpgradeOptions email={me.data.email} /></div>}
          <div className="mt-4"><LinkButton href="/app/practice" variant="ghost">Back to practice</LinkButton></div>
        </Card>
      </div>
    );
  }
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!q) return <Spinner />;
  const left = q.time_seconds - used;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">{back}<Badge>{q.type}</Badge></div>
      <Card><p className="text-lg font-semibold">{q.question}</p></Card>

      {stage === "write" && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Suggested time {clock(q.time_seconds)}</p>
            <p role="timer" aria-label="Time left" className={`font-mono text-lg ${started && left < 0 ? "text-lime" : ""}`}>{started ? `${left < 0 ? "+" : ""}${clock(left)}` : clock(q.time_seconds)}</p>
          </div>
          {!started ? (
            <div className="mt-3"><Button onClick={start}>Start the timer</Button><p className="mt-2 text-xs text-muted">Answer out loud first if you can, then write the main points. Use your own real example.</p></div>
          ) : (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} maxLength={4000} aria-label="Your answer"
                className="mt-3 w-full rounded-xl border border-line bg-surface2 px-3 py-2 text-sm" placeholder="Situation, what you did, the result, what you learned." />
              <div className="mt-3 flex items-center gap-3">
                <Button disabled={text.trim().length < 10} onClick={finish}>Done, check my answer</Button>
                <span className="text-xs text-muted">{text.length}/4000</span>
              </div>
              {left < 0 && <p className="mt-2 text-sm text-muted">Past the suggested time. In a real interview, wrap up now.</p>}
            </>
          )}
        </Card>
      )}

      {stage === "check" && (
        <Card>
          <h2 className="font-semibold">Check yourself</h2>
          <p className="mt-1 text-sm text-muted">Be honest. Tick what your answer really did.</p>
          <ul className="mt-3 space-y-2">
            {q.rubric.map((r, i) => (
              <li key={i}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={ticks[i] ?? false} onChange={(e) => setTicks((t) => t.map((x, j) => (j === i ? e.target.checked : x)))} />
                  <span>{r}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4"><Button disabled={busy} onClick={save}>See my score and a model answer</Button></div>
          {msg && <Notice>{msg}</Notice>}
        </Card>
      )}

      {stage === "done" && res && (
        <>
          <Card><p className="text-sm text-muted">Your self check score</p><p className="text-3xl font-bold">{res.self_score}<span className="text-base text-muted"> / 100</span></p><p className="mt-1 text-sm text-muted">Time used {clock(used)}</p></Card>
          <Card><h2 className="font-semibold">A model answer</h2><p className="mt-2 text-sm">{res.model_answer}</p><p className="mt-2 text-xs text-muted">A model to learn the shape from. Do not copy it: tell your own true story.</p></Card>
          <Card>
            <h2 className="font-semibold">Want a second opinion?</h2>
            {!fb ? (
              <>
                <p className="mt-1 text-sm text-muted">AI feedback is optional. It uses one of your daily reviews, so use it on the answers that matter most.</p>
                <div className="mt-3"><Button variant="ghost" disabled={busy} onClick={askAi}>Get AI feedback</Button></div>
              </>
            ) : (
              <div className="mt-2 space-y-2 text-sm">
                <p>AI score: <span className="font-semibold">{fb.score}</span> / 100</p>
                <p className="font-medium">Strengths</p><ul className="list-disc pl-5">{fb.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
                <p className="font-medium">Gaps</p><ul className="list-disc pl-5">{fb.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
                <p className="font-medium">Next steps</p><ul className="list-disc pl-5">{fb.next_steps.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {msg && <Notice>{msg}</Notice>}
          </Card>
          <div className="flex gap-2"><LinkButton href={`/app/practice/${q.role}`}>Next question</LinkButton><LinkButton href="/app/practice" variant="ghost">All roles</LinkButton></div>
        </>
      )}
    </div>
  );
}
