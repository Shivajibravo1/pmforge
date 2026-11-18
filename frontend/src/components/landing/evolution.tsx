"use client";

import { useState } from "react";
import { Character } from "@/components/character";
import { FORMS } from "@/lib/gamify";

/** Pick a form to see the character at that stage. XP comes from finishing lessons. */
export function Evolution() {
  const [i, setI] = useState(0);
  const f = FORMS[i];
  return (
    <div className="grid items-center gap-6 rounded-3xl border border-line bg-surface p-5 md:grid-cols-[auto_1fr] md:p-8">
      <div className="relative mx-auto flex h-72 w-60 items-center justify-center">
        <div aria-hidden className="absolute inset-4 rounded-full bg-violet/25 blur-3xl" />
        <div key={f.tier} className="pm-pop relative">
          <Character tier={f.tier} size={240} />
        </div>
      </div>
      <div>
        <p className="text-sm text-muted">Form {f.tier} of {FORMS.length} · from {f.minXp} XP</p>
        <h3 className="mt-1 text-2xl font-bold">{f.name}: {f.title}</h3>
        <p className="mt-2 max-w-md text-muted">{f.blurb}</p>
        <div role="group" aria-label="Choose a form" className="mt-5 flex flex-wrap gap-2">
          {FORMS.map((x, k) => (
            <button
              key={x.tier}
              type="button"
              aria-pressed={k === i}
              aria-label={`${x.name}, form ${x.tier}`}
              onClick={() => setI(k)}
              className={`flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-semibold transition ${
                k === i ? "border-lime bg-lime text-black" : k < i ? "border-violet bg-violet text-white" : "border-line text-muted hover:text-white"
              }`}
            >
              {x.tier}
            </button>
          ))}
        </div>
        <div className="mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${((i + 1) / FORMS.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
