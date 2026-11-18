import { AlertTriangle, ArrowRightCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { InView } from "./motion";

/**
 * Static, scripted preview of a mentor review. It makes no network call and accepts no input,
 * so the public page has no AI cost and no prompt-injection surface. The scenario is illustrative.
 * The feedback appears line by line when scrolled into view (CSS only).
 */
const rows = [
  { icon: CheckCircle2, tone: "text-lime", title: "Strengths", text: "Scope boundary and sponsor are explicit. The date is concrete." },
  { icon: AlertTriangle, tone: "text-[#ffb454]", title: "Gaps", text: "No success measures and no key risks or assumptions. A sponsor cannot sign off yet." },
  { icon: ArrowRightCircle, tone: "text-[#b58cff]", title: "Next steps", text: "Add two measurable outcomes and a top-five risk list with owners, then resubmit." },
];

export function MentorPreview() {
  return (
    <InView>
      <Card className="space-y-4">
        <p className="text-xs text-muted">Illustrative example. Not a real learner&apos;s work.</p>
        <div className="rounded-xl bg-surface2 p-4">
          <p className="mb-1 text-xs font-semibold text-lime">You · Day 5 build</p>
          <p className="text-sm">
            I wrote the charter for the website migration. Scope is the marketing site only. Go-live is 30 June. The sponsor
            is the CMO.
          </p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="mb-3 text-xs font-semibold text-lime">Mentor review · rubric-based</p>
          <dl className="space-y-3 text-sm">
            {rows.map(({ icon: Icon, tone, title, text }, i) => (
              <div key={title} className="pm-line-in flex gap-3" style={{ "--i": i + 1 } as React.CSSProperties}>
                <Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
                <div>
                  <dt className="font-semibold">{title}</dt>
                  <dd className="text-muted">{text}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs text-muted">
          The mentor is an AI and can be wrong. Verify important answers, and never share passwords, personal data or
          confidential client information.
        </p>
      </Card>
    </InView>
  );
}
