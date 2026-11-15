"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ReviewOut } from "@/lib/api";

const SECTIONS = [["Strengths", "strengths"], ["Gaps", "gaps"], ["Next steps", "next_steps"]] as const;

export function ReviewPanel({ review, title = "Mentor score" }: { review: ReviewOut; title?: string }) {
  const [copied, setCopied] = useState(false);
  const answer = review.model_answer?.trim() ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-violet bg-surface2 p-4" aria-live="polite">
      <p className="text-lg font-bold text-lime">{title} {review.score}/100</p>
      {SECTIONS.map(([h, k]) => (
        <div key={k}>
          <h3 className="text-sm font-semibold text-white">{h}</h3>
          <ul className="list-disc pl-5 text-sm text-muted">{review[k].map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ))}
      {answer && (
        <section aria-label="Professional version" className="space-y-2 rounded-xl border border-lime/60 bg-black p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-lime">How a professional version looks</h3>
            <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line px-3 text-xs text-white">
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-white">{answer}</p>
          <p className="text-xs text-muted">Built only from what you wrote. Lines marked Assumption need your real value. Rewrite it in your own words before you use it.</p>
        </section>
      )}
    </div>
  );
}
