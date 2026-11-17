import { LinkButton, Card, Badge } from "@/components/ui";
import { PLANS, formatAmount, type Currency } from "@/lib/pricing";

export function Pricing({ currency }: { currency: Currency }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={p.highlight ? "border-violet" : ""}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.highlight && <Badge tone="violet">Best for the full program</Badge>}
            </div>
            <p className="mt-4 text-3xl font-bold">
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
              <LinkButton href="/sign-in" variant={p.id === "free" ? "lime" : "ghost"}>
                Start free
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Prices are shown in {currency === "INR" ? "Indian rupees" : "US dollars"} based on your approximate location.
        The amount charged is confirmed at checkout.
      </p>
    </div>
  );
}
