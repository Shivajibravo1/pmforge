"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, LinkButton } from "@/components/ui";
import { REFUND_WINDOW_DAYS } from "@/lib/legal";
import { PLANS, availableCurrencies, formatAmount, yearlySavingsPercent, type Currency } from "@/lib/pricing";

const OPTIONS: [Currency, string][] = [
  ["INR", "₹ INR"],
  ["USD", "$ USD"],
];

/** The visitor's location picks the starting currency. The visitor can switch it whenever a price exists in it. */
export function Pricing({ initialCurrency }: { initialCurrency: Currency }) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const offered = availableCurrencies();
  const saving = yearlySavingsPercent(currency);

  return (
    <div>
      <div role="group" aria-label="Choose currency" className="mb-6 inline-flex rounded-xl border border-line bg-surface p-1">
        {OPTIONS.map(([c, label]) => {
          const ok = offered.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              disabled={!ok}
              title={ok ? undefined : "Prices in this currency are coming soon"}
              onClick={() => setCurrency(c)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:text-muted ${
                currency === c ? "bg-lime text-black" : "text-white hover:bg-surface2"
              }`}
            >
              {label}
              {!ok && <span className="ml-1 text-xs font-normal">soon</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const amount = p.amounts[currency];
          const points = p.id === "yearly" && saving ? [...p.points.slice(0, 2), `Saves about ${saving}% versus 12 monthly payments`] : p.points;
          return (
            <Card key={p.id} className={p.highlight ? "border-violet" : ""}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.highlight && <Badge tone="violet">Best for the full program</Badge>}
              </div>
              <p className="mt-4 text-3xl font-bold" aria-live="polite">
                {amount !== null ? formatAmount(amount, currency) : "To be announced"}
              </p>
              <p className="text-sm text-muted">{amount !== null ? p.period : "Pricing is announced at launch"}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {points.map((t) => (
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
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">
        We chose a currency from your approximate location. Switch any time.{" "}
        The amount charged is confirmed at checkout. Refunds: {REFUND_WINDOW_DAYS} days from purchase, see the{" "}
        <Link href="/refund" className="underline hover:text-white">Refund Policy</Link>.
      </p>
    </div>
  );
}
