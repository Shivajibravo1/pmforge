import { Badge, Card } from "@/components/ui";
import { SAMPLE_ARTIFACTS } from "@/lib/samples";

/** Admin preview of how reviewed artifacts appear in a portfolio. */
export function SamplePortfolio() {
  return (
    <section aria-label="Sample portfolio" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Sample artifacts</h2>
        <p className="text-sm text-muted">Admin preview of a finished portfolio. Illustrative content, not stored, never shown on a public page.</p>
      </div>
      {SAMPLE_ARTIFACTS.map((a) => (
        <Card key={a.day} className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-lime">Day {a.day} · Sample</p>
              <h3 className="mt-1 text-lg font-bold">{a.title}</h3>
              <p className="mt-1 text-sm text-muted">{a.context}</p>
            </div>
            <Badge tone="lime">{a.score}/100</Badge>
          </div>
          <dl className="space-y-3">
            {a.sections.map((s) => (
              <div key={s.heading} className="rounded-xl border border-line bg-black/40 p-3">
                <dt className="text-sm font-semibold">{s.heading}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-muted">{s.body}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-xl border border-violet/60 bg-violet/10 p-3">
            <p className="text-sm font-semibold">Mentor review</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
              {a.strengths.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <p className="mt-2 text-sm"><span className="font-semibold">Next step:</span> <span className="text-muted">{a.nextStep}</span></p>
          </div>
        </Card>
      ))}
    </section>
  );
}
