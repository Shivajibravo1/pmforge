"use client";

import { useState } from "react";
import { BookOpen, ChevronRight, ClipboardCheck, Hammer, Scale, type LucideIcon } from "lucide-react";
import { InView } from "./motion";

type Step = { name: string; icon: LucideIcon; line: string; example: string };

const STEPS: Step[] = [
  { name: "Learn", icon: BookOpen, line: "A short concept lesson, one screen at a time.", example: "Day 4: technical literacy for IT PMs (SDLC, environments, APIs, cloud basics)" },
  { name: "Build", icon: Hammer, line: "Produce the artifact a sponsor would ask for.", example: "Day 5: write a project charter for a website migration" },
  { name: "Decide", icon: Scale, line: "Make the call in a tough stakeholder scenario.", example: "Day 80: a critical vulnerability is found 2 days before go-live" },
  { name: "Review", icon: ClipboardCheck, line: "Get rubric-based mentor feedback, improve, resubmit.", example: "Strengths, gaps and next steps on your own work" },
];

/** The daily loop as a connected flow. Tap or focus a step to see a real example from the curriculum. */
export function LearningLoop() {
  const [active, setActive] = useState(1);
  const Active = STEPS[active];
  return (
    <InView>
      <div className="relative">
        <ol className="relative grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-8" aria-label="How each day works">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const on = i === active;
            return (
              <li key={s.name} className="relative">
                {i < STEPS.length - 1 && <ChevronRight aria-hidden className="absolute -right-[1.15rem] top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-lime lg:block" />}
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={`group flex min-h-11 w-full flex-col items-center rounded-2xl border p-4 text-center sm:p-5 transition ${
                    on ? "border-lime bg-surface2" : "border-line bg-surface hover:border-violet"
                  }`}
                >
                  <span className={`relative flex h-14 w-14 items-center justify-center rounded-full transition ${on ? "bg-lime text-black" : "bg-violet text-white"}`}>
                    {on && <span aria-hidden className="pm-ping absolute inset-0 rounded-full bg-lime" />}
                    <Icon className="relative h-6 w-6" />
                  </span>
                  <span className="mt-3 text-lg font-semibold">{s.name}</span>
                  <span className="mt-1 text-sm text-muted">{s.line}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm">
          <span className="font-semibold text-lime">{Active.name}.</span> <span className="text-muted">{Active.example}</span>
        </p>
      </div>
    </InView>
  );
}
