"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, LinkButton } from "@/components/ui";
import { REFUND_WINDOW_DAYS } from "@/lib/legal";
import { PLANS, formatAmount, type Currency } from "@/lib/pricing";

const OPTIONS: [Currency, string][] = [
  ["INR", "₹ INR"],
  ["USD", "$ USD"],
];

/** The visitor's location picks the starting currency. The visitor can switch it at any time. */
export function Pricing({ initialCurrency }: { initialCurrency: Currency }) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);

  return (
    <div>
      <div role="group" aria-label="Choose currency" className="mb-6 inline-flex rounded-xl border border-line bg-surface p-1">
        {OPTIONS.map(([c, label]) => (
          <button
            key={c}
            type="button"
            aria-pressed={currency === c}
            onClick={() => setCurrency(c)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition ${
              currency === c ? "bg-lime text-black" : "text-white hover:bg-surface2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={p.highlight ? "border-violet" : ""}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.highlight && <Badge tone="violet">Best for the full program</Badge>}
            </div>
            <p className="mt-4 text-3xl font-bold" aria-live="polite">
              {p.amounts ? formatAmount(p.amounts[currency], currency) : "To be announced"}
            </p>
            <p className="text-sm text-muted">{p.amounts ? p.period : "Pricing is announced at launch"}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {p.points.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="text-lime">+</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <LinkButton href="/sign-in" variant={p.id === "free" ? "lime" : "ghost"}>Start free</LinkButton>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        We chose {initialCurrency === "INR" ? "Indian rupees" : "US dollars"} from your approximate location. Switch any time.
        The amount charged is confirmed at checkout. Refunds: {REFUND_WINDOW_DAYS} days from purchase, see the{" "}
        <Link href="/refund" className="underline hover:text-white">Refund Policy</Link>.
      </p>
    </div>
  );
}
