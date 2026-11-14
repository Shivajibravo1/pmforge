"use client";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { LessonBody } from "@/components/lesson-body";
import { ApiError, type ReviewOut, api, friendly } from "@/lib/api";
import { extractJournal, splitSteps } from "@/lib/blocks";

function Journal({ day, index, prompt, onDone }: { day: number; index: number; prompt: string; onDone: () => void }) {
  const key = `pmforge:journal:${day}:${index}`;
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
  });
  const [review, setReview] = useState<ReviewOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function change(v: string) {
    setText(v);
    try { localStorage.setItem(key, v); } catch { /* storage unavailable */ }
  }

  async function feedback() {
    setBusy(true);
    setMsg("");
    try {
      const a = await api<{ artifact_id: string }>(`/api/v1/lessons/${day}/artifact`, { method: "POST", body: { content: text } });
      setReview(await api<ReviewOut>(`/api/v1/artifacts/${a.artifact_id}/review`, { method: "POST" }));
    } catch (e) {
      setMsg(e instanceof ApiError && e.status === 422 ? "Write a few more sentences first." : friendly(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-lime/60 bg-surface2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-lime">Your turn</p>
        <p className="mt-1 text-base font-semibold text-white">{prompt}</p>
        <label htmlFor={key} className="sr-only">Your answer</label>
        <textarea id={key} rows={8} maxLength={8000} value={text} onChange={(e) => change(e.target.value)}
          className="mt-3 w-full rounded-xl border border-line bg-black p-3 text-sm text-white" placeholder="Write in your own words. Rough is fine." />
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{text.length} characters</span><span>Saves automatically on this device</span></div>
      </div>
      {review && (
        <div className="space-y-3 rounded-2xl border border-violet bg-surface2 p-4" aria-live="polite">
          <p className="text-lg font-bold text-lime">Coach score {review.score}/100</p>
          {([["Strengths", review.strengths], ["Gaps", review.gaps], ["Next steps", review.next_steps]] as const).map(([h, items]) => (
            <div key={h}><h3 className="text-sm font-semibold text-white">{h}</h3><ul className="list-disc pl-5 text-sm text-muted">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
          ))}
        </div>
      )}
      {msg && <p role="alert" className="rounded-xl border border-line bg-surface2 p-3 text-sm text-white">{msg}</p>}
      <button type="button" onClick={feedback} disabled={busy || text.trim().length < 20}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-violet bg-violet/15 p-4 text-left transition hover:bg-violet/25 disabled:opacity-50">
        <Sparkles aria-hidden className="h-6 w-6 shrink-0 text-lime" />
        <span><span className="block font-semibold text-white">{busy ? "Reading your answer" : "Get AI coach feedback on what you wrote"}</span>
          <span className="block text-xs text-muted">A senior PM reviews your specific answer in seconds</span></span>
      </button>
      <Button variant="ghost" className="w-full" onClick={onDone}>{review ? "Continue" : "Skip feedback and continue"} <ArrowRight aria-hidden className="ml-2 h-4 w-4" /></Button>
    </div>
  );
}

export function LessonPlayer({ day, body, finale }: { day: number; body: string; finale: React.ReactNode }) {
  const steps = useMemo(() => splitSteps(body), [body]);
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const step = steps[i];
  const { prompt, rest } = extractJournal(step.body);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [i]);

  const go = (n: number) => setI(Math.min(Math.max(n, 0), steps.length - 1));

  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Previous screen" onClick={() => go(i - 1)} disabled={i === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-white disabled:opacity-30"><ArrowLeft aria-hidden className="h-5 w-5" /></button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label="Lesson progress">
          <div className="h-full rounded-full bg-gradient-to-r from-violet to-lime transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="w-12 text-right font-mono text-xs text-muted">{i + 1}/{steps.length}</span>
      </div>

      <section className="mt-4" aria-live="polite">
        {step.title && <h2 className="text-3xl font-bold leading-tight text-white">{step.title}</h2>}
        <div className="mt-4"><LessonBody body={rest} /></div>
        {prompt && <div className="mt-6"><Journal key={i} day={day} index={i} prompt={prompt} onDone={() => go(i + 1)} /></div>}
        {last && !prompt && <div className="mt-6">{finale}</div>}
      </section>

      {!last && !prompt && (
        <Button className="mt-6 w-full bg-white !text-black" onClick={() => go(i + 1)}>Continue <ArrowRight aria-hidden className="ml-2 h-4 w-4" /></Button>
      )}
      {last && prompt && <div className="mt-6">{finale}</div>}
    </div>
  );
}
