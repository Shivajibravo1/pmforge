import { Briefcase, Bug, Coins, Gauge, MessagesSquare, Repeat, Scale, ShieldAlert, ShieldCheck, TrendingUp, Award, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { CountUp, InView } from "./motion";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const reality = [
  {
    n: 40, suffix: "%+", stat: "40%+",
    text: "of agentic AI projects forecast to be cancelled by the end of 2027, citing rising costs, unclear business value and inadequate risk controls.",
    who: "Gartner forecast, June 2025",
    href: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027.",
  },
  {
    n: 80, suffix: "%+", stat: "80%+",
    text: "of AI projects fail by some estimates, twice the rate of IT projects that do not involve AI.",
    who: "RAND Corporation, root-cause study",
    href: "https://www.rand.org/pubs/research_reports/RRA2680-1.html",
  },
  {
    n: 81, suffix: "%", stat: "81%",
    text: "of project professionals say projects have become more complex, and 97% managed at least one complex project in the past year.",
    who: "PMI Pulse of the Profession 2026",
    href: "https://www.pmi.org/about/press-media/2026/pulse-why-complex-projects-fail-best-practices-are-not-enough-system-thinking",
  },
];

export function Reality() {
  return (
    <div>
      <InView className="grid gap-4 md:grid-cols-3">
        {reality.map((r) => (
          <Card key={r.stat}>
            <p className="text-5xl font-bold text-lime"><CountUp to={r.n} suffix={r.suffix} /></p>
            <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface2">
              <div className="pm-bar h-full rounded-full bg-lime" style={{ width: `${r.n}%` }} />
            </div>
            <p className="mt-3 text-sm">{r.text}</p>
            <a href={r.href} {...ext} className="mt-4 inline-block text-xs text-muted underline hover:text-white">
              {r.who}
            </a>
          </Card>
        ))}
      </InView>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Regulation is arriving, not going away</h3>
          <p className="mt-2 text-sm text-muted">
            The EU AI Act moved its standalone high-risk obligations from 2 August 2026 to 2 December 2027. That is a delay,
            not a pause, and other obligations still apply.{" "}
            <a href="https://www.mondaq.com/eu-digital-omnibus-on-ai-enters-into-force/1825722" {...ext} className="underline hover:text-white">Source</a>
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">Privacy law has teeth</h3>
          <p className="mt-2 text-sm text-muted">
            India&apos;s Digital Personal Data Protection (DPDP) rules become broadly enforceable around 13 May 2027, with
            penalties up to ₹250 crore for failing to keep reasonable security safeguards.{" "}
            <a href="https://uniqus.com/?p=49483" {...ext} className="underline hover:text-white">Source</a>
          </p>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">
        Forecasts are forecasts, not facts, and figures are as of November 2026. PMForge teaches project management
        practice and is not legal advice.
      </p>
    </div>
  );
}

const segmentIcons: LucideIcon[] = [Briefcase, Repeat, Award];
const segments = [
  ["Working IT project managers", "Your sponsor now asks for an AI plan, with security, cost and compliance answers. Get a framework and the proof to back it."],
  ["Career switchers", "Moving from development, business analysis, testing or support? Build the artifacts hiring managers ask to see."],
  ["PMP holders", "The Project Management Professional (PMP) credential opens doors. Add evidence that you can deliver AI-enabled programs safely."],
];

export function Segments() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {segments.map(([t, d], i) => {
        const Icon = segmentIcons[i];
        return (
        <Card key={t}>
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet/25 text-lime"><Icon className="h-5 w-5" /></span>
          <h3 className="font-semibold">{t}</h3>
          <p className="mt-2 text-sm text-muted">{d}</p>
        </Card>
        );
      })}
    </div>
  );
}

const gates = [
  ["Value", "Is the use case worth doing, and can it hit the target?", "Days 93, 94, 103"],
  ["Security", "Can it resist prompt injection, data leakage and weak design?", "Days 75, 76, 108, 109"],
  ["Cost", "What do cloud, tokens and run costs add up to?", "Days 64, 101, 102"],
  ["Compliance", "Which standards and laws apply, and who signs off?", "Days 77, 105, 106, 107, 110"],
];

const gateIcons: LucideIcon[] = [TrendingUp, ShieldCheck, Coins, Scale];

export function Gates() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {gates.map(([t, q, d], i) => {
        const Icon = gateIcons[i];
        return (
        <Card key={t} className="transition hover:-translate-y-1 hover:border-violet">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet text-white"><Icon className="h-6 w-6" /></span>
          <h3 className="mt-3 text-lg font-semibold">{t}</h3>
          <p className="mt-2 text-sm text-muted">{q}</p>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{d}</p>
        </Card>
        );
      })}
    </div>
  );
}

const pressure = [
  ["The model hits 80% against a 95% target and the sponsor wants to launch", "Day 103"],
  ["Legal and the Chief Information Security Officer (CISO) block the launch", "Day 110"],
  ["A critical vulnerability is found 2 days before go-live", "Day 80"],
  ["The AI bill surprises the sponsor", "Days 101 and 102"],
  ["Nobody can explain the regulatory risk tier", "Days 105 to 107"],
  ["You need to prove your skills in an interview", "Day 116 (AI-graded mock interview)"],
];

const pressureIcons: LucideIcon[] = [Gauge, ShieldAlert, Bug, Coins, Scale, MessagesSquare];

export function Pressure() {
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" aria-label="Real project pressures and where PMForge lets you practise them">
      {pressure.map(([a, b], i) => {
        const Icon = pressureIcons[i];
        return (
          <li key={a} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-lime">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface2 text-lime"><Icon className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm">{a}</span>
              <span className="mt-2 inline-block rounded-full bg-violet/30 px-2.5 py-1 text-xs text-lime">Practise: {b}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
