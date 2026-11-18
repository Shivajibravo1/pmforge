"use client";

import { useMemo, useState } from "react";
import raw from "@/lib/curriculum-map.json";
import { FREE_DAYS } from "@/lib/pricing";
import { InView } from "./motion";

type Day = { day: number; type: string; title: string };
const DAYS: Day[] = (raw as [number, string, string][]).map(([day, type, title]) => ({ day, type, title }));

const TYPES: Record<string, { label: string; bg: string }> = {
  C: { label: "Concept", bg: "bg-violet" },
  B: { label: "Build", bg: "bg-lime" },
  S: { label: "Simulation", bg: "bg-[#b58cff]" },
  K: { label: "Critique", bg: "bg-white" },
  P: { label: "Portfolio", bg: "bg-[#8bd3a2]" },
  A: { label: "Assessment", bg: "bg-[#ffb454]" },
  R: { label: "Buffer", bg: "bg-[#5b5b6b]" },
};
const LEVELS = ["Foundations", "Agile and hybrid", "Cloud and DevSecOps", "AI-enabled programs"];

/** All 120 days at a glance, built from the real curriculum. Hover, focus or tap a day to read its title. */
export function DayMap() {
  const [sel, setSel] = useState<Day>(DAYS[4]);
  const [only, setOnly] = useState<string | null>(null);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of DAYS) c[d.type] = (c[d.type] ?? 0) + 1;
    return c;
  }, []);
  const level = Math.floor((sel.day - 1) / 30);

  return (
    <InView>
      <div className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Highlight a lesson type">
          {Object.entries(TYPES).map(([k, t]) => (
            <button
              key={k}
              type="button"
              aria-pressed={only === k}
              onClick={() => setOnly(only === k ? null : k)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs transition ${
                only === k ? "border-lime bg-surface2 text-white" : "border-line text-muted hover:text-white"
              }`}
            >
              <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${t.bg}`} />
              {t.label} <span className="text-white/60">{counts[k]}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {LEVELS.map((name, li) => (
            <div key={name}>
              <p className="mb-1.5 text-xs text-muted">
                <span className="font-semibold text-white">Level {li + 1}</span> · {name}
              </p>
              <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15 lg:grid-cols-30">
                {DAYS.slice(li * 30, li * 30 + 30).map((d, i) => {
                  const dim = only !== null && d.type !== only;
                  const free = d.day <= FREE_DAYS;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      aria-label={`Day ${d.day}, ${TYPES[d.type].label}: ${d.title}${free ? " (free)" : ""}`}
                      aria-pressed={sel.day === d.day}
                      onMouseEnter={() => setSel(d)}
                      onFocus={() => setSel(d)}
                      onClick={() => setSel(d)}
                      style={{ "--i": i + li * 30 } as React.CSSProperties}
                      className={`pm-tile aspect-square min-h-6 rounded-md transition-[opacity,transform] ${TYPES[d.type].bg} ${
                        dim ? "opacity-15" : ""
                      } ${free ? "ring-2 ring-white ring-offset-1 ring-offset-black" : ""} ${sel.day === d.day ? "scale-125 outline outline-2 outline-white" : "hover:scale-110"}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div role="status" aria-live="polite" className="mt-5 flex flex-col gap-1 rounded-2xl bg-black p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-semibold text-lime">Day {sel.day}</span> · <span className="text-white">{sel.title}</span>
          </p>
          <p className="text-xs text-muted">
            {TYPES[sel.type].label} · Level {level + 1}
            {sel.day <= FREE_DAYS ? " · Free" : ""}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">White ring marks the {FREE_DAYS} free days. Every day is a short lesson, a build or a scenario.</p>
      </div>
    </InView>
  );
}
