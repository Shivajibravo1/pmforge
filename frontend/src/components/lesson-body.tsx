"use client";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, Brain, CheckCircle2, ChevronDown, Cloud, Code2, DollarSign, Database, Eye, FileText,
  Flag, GitBranch, Layers, Lightbulb, Link2, Lock, type LucideIcon, Map as MapIcon, Rocket, Search, Server, Settings, ShieldCheck,
  Sparkles, Target, Users, Workflow, XCircle, Zap, Clock, Info, MessageCircle, Bot, Network, KeyRound, Radar, Wrench, Siren, RotateCcw, Handshake, Cpu, Compass, Mic,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BLOCK_KINDS, type BlockKind, parseAccordion, parseArch, parseCards, parseChat, parseDecision, parseRag, parseTimeline, type Tone, parseChecklist, parseFlow, parseQuiz, parseQuote, parseRef, parseStats, parseMindmap, parseFlashcards, parseIncident, parseAnswer, parseLens,
} from "@/lib/blocks";

const ICONS: Record<string, LucideIcon> = {
  target: Target, users: Users, shield: ShieldCheck, server: Server, cloud: Cloud, database: Database, code: Code2, git: GitBranch,
  alert: AlertTriangle, check: CheckCircle2, clock: Clock, money: DollarSign, layers: Layers, lock: Lock, workflow: Workflow,
  chart: BarChart3, rocket: Rocket, search: Search, file: FileText, link: Link2, settings: Settings, brain: Brain, zap: Zap,
  flag: Flag, eye: Eye, book: BookOpen, map: MapIcon, spark: Sparkles,
  bot: Bot, network: Network, key: KeyRound, radar: Radar, wrench: Wrench, handshake: Handshake, cpu: Cpu, compass: Compass, mic: Mic,
};
const iconFor = (name: string): LucideIcon => ICONS[name.toLowerCase()] ?? Sparkles;

export function Flow({ src }: { src: string }) {
  const steps = parseFlow(src);
  return (
    <ol className="my-6 grid gap-3 md:auto-cols-fr md:grid-flow-col" style={{ listStyle: "none", paddingLeft: 0 }} aria-label="Process">
      {steps.map((s, i) => (
        <li key={i} className="relative rounded-2xl border border-line bg-surface2 p-4">
          <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet text-sm font-bold text-white">{i + 1}</span>
          <p className="font-semibold text-white">{s.title}</p>
          {s.text && <p className="mt-1 text-sm text-muted">{s.text}</p>}
          {i < steps.length - 1 && <ArrowRight aria-hidden className="absolute -bottom-4 left-6 h-5 w-5 rotate-90 text-lime md:-right-4 md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2 md:rotate-0 md:bg-black" />}
        </li>
      ))}
    </ol>
  );
}

function Cards({ src }: { src: string }) {
  const items = parseCards(src);
  return (
    <div className="my-6 grid gap-3 sm:grid-cols-2">
      {items.map((c, i) => {
        const Icon = iconFor(c.icon);
        return (
          <div key={i} className="rounded-2xl border border-line bg-surface2 p-4 transition hover:border-violet">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet/20 text-lime"><Icon aria-hidden className="h-5 w-5" /></span>
            <p className="font-semibold text-white">{c.title}</p>
            <p className="mt-1 text-sm text-muted">{c.text}</p>
            {c.risk && (
              <div className="mt-3 flex gap-2 rounded-xl border border-violet bg-violet/20 p-3">
                <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
                <p className="text-sm text-white"><span className="block text-xs font-semibold uppercase tracking-wide text-lime">What goes wrong</span>{c.risk}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stats({ src }: { src: string }) {
  return (
    <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {parseStats(src).map((s, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface2 p-4 text-center">
          <p className="text-3xl font-bold text-lime">{s.value}</p>
          <p className="mt-1 text-xs text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

const CALLOUT: Record<string, { Icon: LucideIcon; label: string; cls: string }> = {
  tip: { Icon: Lightbulb, label: "Tip", cls: "border-lime/60 bg-lime/10" },
  ai: { Icon: Sparkles, label: "AI lens", cls: "border-violet bg-gradient-to-r from-violet/30 to-lime/10" },
  note: { Icon: Info, label: "Note", cls: "border-line bg-surface2" },
  warn: { Icon: AlertTriangle, label: "Watch out", cls: "border-violet bg-violet/15" },
  key: { Icon: Target, label: "Key idea", cls: "border-violet bg-violet/25" },
};

function Callout({ kind, src }: { kind: string; src: string }) {
  const { Icon, label, cls } = CALLOUT[kind];
  return (
    <aside className={`my-6 flex gap-3 rounded-2xl border p-4 ${cls}`}>
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
      <div><p className="text-xs font-semibold uppercase tracking-wide text-lime">{label}</p><p className="mt-1 text-sm leading-relaxed text-white">{src.trim()}</p></div>
    </aside>
  );
}

const LENS_STYLE: Record<string, { Icon: LucideIcon; cls: string }> = {
  shift: { Icon: Compass, cls: "text-lime" },
  example: { Icon: Lightbulb, cls: "text-lime" },
  use: { Icon: Sparkles, cls: "text-lime" },
  keep: { Icon: Users, cls: "text-white" },
  risk: { Icon: AlertTriangle, cls: "text-white" },
  control: { Icon: ShieldCheck, cls: "text-lime" },
  interview: { Icon: Mic, cls: "text-lime" },
};

function AiLens({ rows }: { rows: { label: string; text: string }[] }) {
  return (
    <section aria-label="AI lens" className="my-6 rounded-2xl border border-violet bg-gradient-to-br from-violet/30 to-lime/10 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime"><Sparkles aria-hidden className="h-4 w-4" />AI lens</p>
      <dl className="mt-3 space-y-3">
        {rows.map((r) => {
          const key = Object.keys(LENS_STYLE).find((k) => r.label.toLowerCase().startsWith(k)) ?? "shift";
          const { Icon, cls } = LENS_STYLE[key];
          return (
            <div key={r.label} className="flex gap-3">
              <Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} />
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{r.label}</dt><dd className="mt-0.5 text-sm leading-relaxed text-white">{r.text}</dd></div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Checklist({ src }: { src: string }) {
  const items = parseChecklist(src);
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div className="my-6 rounded-2xl border border-line bg-surface2 p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted"><span>Checklist</span><span>{count}/{items.length}</span></div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-black" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={count}>
        <div className="h-full bg-lime transition-all" style={{ width: `${(count / items.length) * 100}%` }} />
      </div>
      <ul className="space-y-2" style={{ listStyle: "none", paddingLeft: 0 }}>
        {items.map((t, i) => (
          <li key={i}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2 text-sm hover:bg-black/40">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#C6FF34]" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} />
              <span className={done[i] ? "text-muted line-through" : "text-white"}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Quiz({ src }: { src: string }) {
  const q = parseQuiz(src);
  const [pick, setPick] = useState<number | null>(null);
  if (!q) return null;
  return (
    <div className="my-6 rounded-2xl border border-violet bg-surface2 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime"><Brain aria-hidden className="h-4 w-4" />Quick check</p>
      <p className="mb-3 font-semibold text-white">{q.question}</p>
      <div className="space-y-2" role="group" aria-label="Answer options">
        {q.options.map((o, i) => {
          const chosen = pick === i;
          const show = pick !== null;
          const state = !show ? "border-line hover:border-violet" : o.correct ? "border-lime bg-lime/10" : chosen ? "border-violet bg-violet/20" : "border-line opacity-60";
          return (
            <button key={i} type="button" disabled={show} onClick={() => setPick(i)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm text-white transition ${state}`}>
              {show && (o.correct ? <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-lime" /> : chosen ? <XCircle aria-hidden className="h-5 w-5 shrink-0 text-white" /> : <span className="h-5 w-5 shrink-0" />)}
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          <strong className="text-white">{q.options[pick].correct ? "Correct. " : "Not quite. "}</strong>{q.explain}
        </p>
      )}
      {pick !== null && <button type="button" onClick={() => setPick(null)} className="mt-3 text-xs underline text-muted">Try again</button>}
    </div>
  );
}

function Accordion({ src }: { src: string }) {
  return (
    <div className="my-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface2">
      {parseAccordion(src).map((a, i) => (
        <details key={i} className="group p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-white">
            {a.title}<ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-lime transition group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted">{a.text}</p>
        </details>
      ))}
    </div>
  );
}

function Ref({ src }: { src: string }) {
  const rows = parseRef(src);
  return (
    <aside className="my-6 rounded-2xl border border-violet/60 bg-surface2 p-4" aria-label="Reference and interview prep">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime">
        <BookOpen aria-hidden className="h-4 w-4" />Reference and interview prep
      </p>
      <ul className="mt-3 space-y-3" style={{ listStyle: "none", paddingLeft: 0 }}>
        {rows.map((r, i) => (
          <li key={i} className="rounded-xl border border-line bg-black p-3">
            <p className="text-sm font-semibold text-white"><span className="mr-2 rounded-md bg-violet px-2 py-0.5 text-xs">{r.framework}</span>{r.where}</p>
            {r.use && <p className="mt-1 text-sm text-muted">{r.use}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Names and topics only. Check the current edition before you quote one in an interview or a document.</p>
    </aside>
  );
}

const BRANCH_TONES = ["border-lime", "border-violet", "border-white/60", "border-lime/60", "border-violet/60", "border-white/30"];

function MindMap({ src }: { src: string }) {
  const { centre, branches } = parseMindmap(src);
  return (
    <figure className="my-6 rounded-2xl border border-line bg-surface2 p-4" aria-label="Mind map">
      {centre && <div className="mx-auto mb-4 w-fit max-w-full rounded-full border-2 border-lime bg-violet px-5 py-2 text-center text-sm font-bold text-white">{centre}</div>}
      <ul className="grid gap-3 sm:grid-cols-2" style={{ listStyle: "none", paddingLeft: 0 }}>
        {branches.map((b, i) => (
          <li key={i} className={`rounded-xl border-l-4 bg-black p-3 ${BRANCH_TONES[i % BRANCH_TONES.length]}`}>
            <p className="text-sm font-semibold text-white">{b.name}</p>
            <ul className="mt-2 flex flex-wrap gap-2" style={{ listStyle: "none", paddingLeft: 0 }}>
              {b.children.map((c, j) => <li key={j} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{c}</li>)}
            </ul>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Flashcards({ src }: { src: string }) {
  const deck = parseFlashcards(src);
  const [queue, setQueue] = useState(() => deck.map((_, i) => i));
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  if (deck.length === 0) return null;
  if (queue.length === 0) {
    return (
      <div className="my-6 rounded-2xl border border-lime/60 bg-surface2 p-4 text-center" role="status">
        <p className="font-semibold text-white">Deck complete. You knew {known} of {deck.length} first time or after review.</p>
        <button type="button" onClick={() => { setQueue(deck.map((_, i) => i)); setKnown(0); setFlipped(false); }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm text-white"><RotateCcw aria-hidden className="h-4 w-4" />Restart deck</button>
      </div>
    );
  }
  const card = deck[queue[0]];
  const next = (gotIt: boolean) => {
    setFlipped(false);
    setQueue((q) => (gotIt ? q.slice(1) : [...q.slice(1), q[0]]));
    if (gotIt) setKnown((k) => k + 1);
  };
  return (
    <section className="my-6 rounded-2xl border border-violet/60 bg-surface2 p-4" aria-label="Flashcards">
      <p className="text-xs font-semibold uppercase tracking-wide text-lime">Flashcards, {queue.length} left</p>
      <button type="button" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}
        className="mt-3 flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-line bg-black p-4 text-center text-white">
        <span className="text-xs uppercase tracking-wide text-muted">{flipped ? "Answer" : "Question, tap to flip"}</span>
        <span className="mt-2 text-base font-semibold">{flipped ? card.back : card.front}</span>
      </button>
      {flipped && (
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => next(true)} className="min-h-11 flex-1 rounded-xl bg-lime px-4 text-sm font-semibold text-black">Got it</button>
          <button type="button" onClick={() => next(false)} className="min-h-11 flex-1 rounded-xl border border-line px-4 text-sm text-white">Review again</button>
        </div>
      )}
    </section>
  );
}

const INCIDENT_TONE: Record<string, string> = {
  info: "bg-white/10 text-white", bad: "bg-red-500/20 text-white", warn: "bg-amber-400/20 text-white", ok: "bg-lime/20 text-white",
};

function Incident({ src }: { src: string }) {
  const { title, rows } = parseIncident(src);
  return (
    <section className="my-6 rounded-2xl border border-violet/60 bg-surface2 p-4" aria-label="Incident and resolution">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime"><Siren aria-hidden className="h-4 w-4" />Incident and resolution</p>
      {title && <p className="mt-1 text-base font-bold text-white">{title}</p>}
      <dl className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className={`rounded-xl p-3 ${INCIDENT_TONE[r.tone]}`}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-lime">{r.label}</dt>
            <dd className="mt-1 text-sm">{r.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AnswerBlock({ src }: { src: string }) {
  const a = parseAnswer(src);
  if (!a) return null;
  return (
    <section className="my-6 space-y-3 rounded-2xl border border-lime/60 bg-surface2 p-4" aria-label="Interview answer">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime"><Mic aria-hidden className="h-4 w-4" />Interview answer</p>
      <p className="text-base font-semibold text-white">{a.question}</p>
      {a.weak.map((w, i) => (
        <div key={i} className="flex gap-2 rounded-xl border border-line bg-black p-3">
          <XCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-white"><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Weak answer</span>{w.text}{w.why && <span className="mt-1 block text-muted">Why it loses marks: {w.why}</span>}</p>
        </div>
      ))}
      <div className="flex gap-2 rounded-xl border border-lime/60 bg-black p-3">
        <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
        <p className="text-sm text-white"><span className="block text-xs font-semibold uppercase tracking-wide text-lime">Strong answer</span>{a.strong}</p>
      </div>
      {a.tips.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lime">Tailor it</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">{a.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

function Quote({ src }: { src: string }) {
  return (
    <div className="my-6 space-y-3 border-l-4 border-lime bg-surface2 p-4" role="group" aria-label="Workplace messages">
      {parseQuote(src).map((q, i) => (
        <p key={i} className="text-sm italic leading-relaxed text-white">&ldquo;{q.text}&rdquo;{q.who && <span className="not-italic text-muted">, {q.who}</span>}</p>
      ))}
    </div>
  );
}

function Arch({ src }: { src: string }) {
  const { title, rows } = parseArch(src);
  const layers = rows.filter((r) => !r.cross);
  const cross = rows.filter((r) => r.cross);
  return (
    <figure className="my-6 rounded-2xl border border-line bg-surface2 p-4" aria-label={title || "Architecture diagram"}>
      {title && <figcaption className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime"><Layers aria-hidden className="h-4 w-4" />{title}</figcaption>}
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          {layers.map((r, i) => (
            <div key={i}>
              <div className="rounded-xl border border-line bg-black/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet" style={{ color: "#b79cff" }}>{r.name}</p>
                <div className="flex flex-wrap gap-2">
                  {r.items.map((it) => <span key={it} className="rounded-lg border border-violet/60 bg-violet/20 px-2.5 py-1 text-xs text-white">{it}</span>)}
                </div>
              </div>
              {i < layers.length - 1 && <div className="flex justify-center py-1"><ArrowRight aria-hidden className="h-4 w-4 rotate-90 text-lime" /></div>}
            </div>
          ))}
        </div>
        {cross.map((r, i) => (
          <div key={i} className="flex w-20 shrink-0 flex-col items-center rounded-xl border border-lime/70 bg-lime/10 p-2 text-center">
            <ShieldCheck aria-hidden className="h-5 w-5 text-lime" />
            <p className="mt-1 text-xs font-semibold text-lime">{r.name}</p>
            <ul className="mt-2 space-y-1 text-[10px] leading-tight text-white" style={{ listStyle: "none", paddingLeft: 0 }}>{r.items.map((it) => <li key={it}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </figure>
  );
}

const AVATAR = ["bg-violet text-white", "bg-lime text-black", "bg-[#4b1fa6] text-white", "bg-white text-black", "bg-[#2a2a35] text-white"];
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const avatarFor = (n: string) => AVATAR[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

function Chat({ src }: { src: string }) {
  const { title, messages } = parseChat(src);
  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-line bg-black/60" aria-label={title || "Conversation"}>
      <figcaption className="flex items-center gap-2 border-b border-line bg-surface2 px-4 py-2 text-xs font-semibold text-muted"><MessageCircle aria-hidden className="h-4 w-4 text-lime" />{title || "Conversation"}</figcaption>
      <div className="space-y-4 p-4">
        {messages.map((m, i) => (
          <div key={i} className="pm-slide flex gap-3" style={{ animationDelay: `${i * 90}ms` }}>
            <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarFor(m.name)}`}>{initials(m.name)}</span>
            <div className="min-w-0">
              <p className="text-sm"><span className="font-semibold text-white">{m.name}</span>{m.role && <span className="text-muted"> · {m.role}</span>}</p>
              <p className="mt-1 rounded-2xl rounded-tl-sm bg-surface2 px-3 py-2 text-sm leading-relaxed text-white">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

const TONE: Record<Tone, string> = { ok: "bg-lime", warn: "bg-[#ffb020]", bad: "bg-[#ff6b6b]", info: "bg-violet" };
const TONE_LABEL: Record<Tone, string> = { ok: "On track", warn: "Warning", bad: "Problem", info: "Event" };

function Timeline({ src }: { src: string }) {
  const events = parseTimeline(src);
  return (
    <ol className="my-6 border-l-2 border-line pl-5" style={{ listStyle: "none" }} aria-label="Timeline">
      {events.map((e, i) => (
        <li key={i} className="pm-slide relative pb-5 last:pb-0" style={{ animationDelay: `${i * 90}ms` }}>
          <span aria-hidden className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-black ${TONE[e.tone]}`} />
          <p className="text-xs font-semibold uppercase tracking-wide text-lime">{e.when}<span className="sr-only"> ({TONE_LABEL[e.tone]})</span></p>
          <p className="mt-0.5 text-sm leading-relaxed text-white">{e.text}</p>
        </li>
      ))}
    </ol>
  );
}

const RAG_STYLE = { R: "border-[#ff6b6b] bg-[#ff6b6b]/10", A: "border-[#ffb020] bg-[#ffb020]/10", G: "border-lime bg-lime/10" } as const;
const RAG_DOT = { R: "bg-[#ff6b6b]", A: "bg-[#ffb020]", G: "bg-lime" } as const;
const RAG_NAME = { R: "Red", A: "Amber", G: "Green" } as const;

function Rag({ src }: { src: string }) {
  return (
    <div className="my-6 grid gap-3 sm:grid-cols-2" role="list" aria-label="Project health">
      {parseRag(src).map((r, i) => (
        <div key={i} role="listitem" className={`rounded-2xl border p-3 ${RAG_STYLE[r.code]}`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-white"><span aria-hidden className={`h-3 w-3 rounded-full ${RAG_DOT[r.code]}`} />{r.area}<span className="ml-auto rounded-full bg-black/50 px-2 py-0.5 text-xs">{RAG_NAME[r.code]}</span></p>
          <p className="mt-1 text-sm text-muted">{r.note}</p>
        </div>
      ))}
    </div>
  );
}

function DecisionBlock({ src }: { src: string }) {
  const d = parseDecision(src);
  const [pick, setPick] = useState<number | null>(null);
  if (!d) return null;
  return (
    <div className="my-6 rounded-2xl border border-lime/60 bg-surface2 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime"><Flag aria-hidden className="h-4 w-4" />Your call</p>
      <p className="mb-3 font-semibold leading-relaxed text-white">{d.situation}</p>
      <div className="space-y-2" role="group" aria-label="Your options">
        {d.options.map((o, i) => {
          const shown = pick !== null;
          const chosen = pick === i;
          const state = !shown ? "border-line hover:border-violet" : o.best ? "border-lime bg-lime/10" : chosen ? "border-violet bg-violet/20" : "border-line opacity-80";
          return (
            <button key={i} type="button" disabled={shown} onClick={() => setPick(i)} className={`block min-h-11 w-full rounded-xl border p-3 text-left text-sm text-white transition ${state}`}>
              <span className="flex items-start gap-2">
                {shown && (o.best ? <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-lime" /> : chosen ? <XCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" /> : <span className="h-5 w-5 shrink-0" />)}
                <span className="font-medium">{o.text}</span>
              </span>
              {shown && <span className="pm-slide mt-2 block pl-7 text-muted">{chosen ? "You chose this. " : ""}{o.result}</span>}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <div className="pm-slide mt-3 rounded-xl border border-violet bg-violet/20 p-3" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-lime">{d.options[pick].best ? "Good call" : "Senior PM take"}</p>
          <p className="mt-1 text-sm text-white">{d.take}</p>
          <button type="button" onClick={() => setPick(null)} className="mt-2 text-xs text-muted underline">Try a different choice</button>
        </div>
      )}
    </div>
  );
}

function renderBlock(kind: BlockKind, src: string): ReactNode {
  switch (kind) {
    case "chat": return <Chat src={src} />;
    case "timeline": return <Timeline src={src} />;
    case "rag": return <Rag src={src} />;
    case "decision": return <DecisionBlock src={src} />;
    case "arch": return <Arch src={src} />;
    case "quote": return <Quote src={src} />;
    case "flow": return <Flow src={src} />;
    case "cards": return <Cards src={src} />;
    case "stats": return <Stats src={src} />;
    case "checklist": return <Checklist src={src} />;
    case "quiz": return <Quiz src={src} />;
    case "accordion": return <Accordion src={src} />;
    case "ref": return <Ref src={src} />;
    case "mindmap": return <MindMap src={src} />;
    case "flashcards": return <Flashcards src={src} />;
    case "incident": return <Incident src={src} />;
    case "answer": return <AnswerBlock src={src} />;
    case "ai": {
      const rows = parseLens(src);
      return rows ? <AiLens rows={rows} /> : <Callout kind={kind} src={src} />;
    }
    default: return <Callout kind={kind} src={src} />;
  }
}

export function LessonBody({ body }: { body: string }) {
  return (
    <div className="prose-pm">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1] as BlockKind | undefined;
            if (lang && BLOCK_KINDS.includes(lang)) return renderBlock(lang, String(children));
            return <code className={className}>{children}</code>;
          },
          table: ({ children }) => <div className="my-6 overflow-x-auto rounded-2xl border border-line"><table>{children}</table></div>,
                  }}
      >
        {body}
      </Markdown>
    </div>
  );
}
