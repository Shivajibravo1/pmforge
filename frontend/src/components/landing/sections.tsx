import { Card } from "@/components/ui";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const reality = [
  {
    stat: "40%+",
    text: "of agentic AI projects forecast to be cancelled by the end of 2027, citing rising costs, unclear business value and inadequate risk controls.",
    who: "Gartner forecast, June 2025",
    href: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027.",
  },
  {
    stat: "80%+",
    text: "of AI projects fail by some estimates, twice the rate of IT projects that do not involve AI.",
    who: "RAND Corporation, root-cause study",
    href: "https://www.rand.org/pubs/research_reports/RRA2680-1.html",
  },
  {
    stat: "81%",
    text: "of project professionals say projects have become more complex, and 97% managed at least one complex project in the past year.",
    who: "PMI Pulse of the Profession 2026",
    href: "https://www.pmi.org/about/press-media/2026/pulse-why-complex-projects-fail-best-practices-are-not-enough-system-thinking",
  },
];

export function Reality() {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {reality.map((r) => (
          <Card key={r.stat}>
            <p className="text-4xl font-bold text-lime">{r.stat}</p>
            <p className="mt-3 text-sm">{r.text}</p>
            <a href={r.href} {...ext} className="mt-4 inline-block text-xs text-muted underline hover:text-white">
              {r.who}
            </a>
          </Card>
        ))}
      </div>
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

const segments = [
  ["Working IT project managers", "Your sponsor now asks for an AI plan, with security, cost and compliance answers. Get a framework and the proof to back it."],
  ["Career switchers", "Moving from development, business analysis, testing or support? Build the artifacts hiring managers ask to see."],
  ["PMP holders", "The Project Management Professional (PMP) credential opens doors. Add evidence that you can deliver AI-enabled programs safely."],
];

export function Segments() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {segments.map(([t, d]) => (
        <Card key={t}>
          <h3 className="font-semibold">{t}</h3>
          <p className="mt-2 text-sm text-muted">{d}</p>
        </Card>
      ))}
    </div>
  );
}

const gates = [
  ["Value", "Is the use case worth doing, and can it hit the target?", "Days 93, 94, 103"],
  ["Security", "Can it resist prompt injection, data leakage and weak design?", "Days 75, 76, 108, 109"],
  ["Cost", "What do cloud, tokens and run costs add up to?", "Days 64, 101, 102"],
  ["Compliance", "Which standards and laws apply, and who signs off?", "Days 77, 105, 106, 107, 110"],
];

export function Gates() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {gates.map(([t, q, d], i) => (
        <Card key={t}>
          <span className="text-xs font-semibold text-lime">Gate {i + 1}</span>
          <h3 className="mt-1 text-lg font-semibold">{t}</h3>
          <p className="mt-2 text-sm text-muted">{q}</p>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{d}</p>
        </Card>
      ))}
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

export function Pressure() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">Real project pressures and where PMForge lets you practise them</caption>
        <thead>
          <tr className="border-b border-line bg-surface2 text-muted">
            <th scope="col" className="p-4 font-medium">When this happens</th>
            <th scope="col" className="p-4 font-medium">You practise it in</th>
          </tr>
        </thead>
        <tbody>
          {pressure.map(([a, b]) => (
            <tr key={a} className="border-b border-line last:border-0">
              <td className="p-4">{a}</td>
              <td className="p-4 text-lime">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
