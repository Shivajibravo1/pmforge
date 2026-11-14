"use client";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, Brain, CheckCircle2, ChevronDown, Cloud, Code2, DollarSign, Database, Eye, FileText,
  Flag, GitBranch, Layers, Lightbulb, Link2, Lock, type LucideIcon, Map as MapIcon, Rocket, Search, Server, Settings, ShieldCheck,
  Sparkles, Target, Users, Workflow, XCircle, Zap, Clock, Info,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BLOCK_KINDS, type BlockKind, parseAccordion, parseCards, parseChecklist, parseFlow, parseQuiz, parseStats,
} from "@/lib/blocks";

const ICONS: Record<string, LucideIcon> = {
  target: Target, users: Users, shield: ShieldCheck, server: Server, cloud: Cloud, database: Database, code: Code2, git: GitBranch,
  alert: AlertTriangle, check: CheckCircle2, clock: Clock, money: DollarSign, layers: Layers, lock: Lock, workflow: Workflow,
  chart: BarChart3, rocket: Rocket, search: Search, file: FileText, link: Link2, settings: Settings, brain: Brain, zap: Zap,
  flag: Flag, eye: Eye, book: BookOpen, map: MapIcon, spark: Sparkles,
};
const iconFor = (name: string): LucideIcon => ICONS[name.toLowerCase()] ?? Sparkles;

function Flow({ src }: { src: string }) {
  const steps = parseFlow(src);
  return (
    <ol className="my-6 grid gap-3 md:auto-cols-fr md:grid-flow-col" aria-label="Process">
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
      <ul className="space-y-2">
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

function renderBlock(kind: BlockKind, src: string): ReactNode {
  switch (kind) {
    case "flow": return <Flow src={src} />;
    case "cards": return <Cards src={src} />;
    case "stats": return <Stats src={src} />;
    case "checklist": return <Checklist src={src} />;
    case "quiz": return <Quiz src={src} />;
    case "accordion": return <Accordion src={src} />;
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
          h2: ({ children }) => <h2 className="flex items-center gap-3"><span aria-hidden className="h-6 w-1.5 rounded-full bg-violet" />{children}</h2>,
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
