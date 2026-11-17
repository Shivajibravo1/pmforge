import { Card } from "@/components/ui";

/**
 * Static, scripted preview of a mentor review. It makes no network call and accepts no input,
 * so the public page has no AI cost and no prompt-injection surface. The scenario is illustrative.
 */
export function MentorPreview() {
  return (
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
        <p className="mb-2 text-xs font-semibold text-lime">Mentor review · rubric-based</p>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold">Strengths</dt>
            <dd className="text-muted">Scope boundary and sponsor are explicit. The date is concrete.</dd>
          </div>
          <div>
            <dt className="font-semibold">Gaps</dt>
            <dd className="text-muted">No success measures and no key risks or assumptions. A sponsor cannot sign off yet.</dd>
          </div>
          <div>
            <dt className="font-semibold">Next steps</dt>
            <dd className="text-muted">Add two measurable outcomes and a top-five risk list with owners, then resubmit.</dd>
          </div>
        </dl>
      </div>
      <p className="text-xs text-muted">
        The mentor is an AI and can be wrong. Verify important answers, and never share passwords, personal data or
        confidential client information.
      </p>
    </Card>
  );
}
