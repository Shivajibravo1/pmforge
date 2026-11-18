/**
 * Landing page pricing and currency selection.
 *
 * Display only: the amount a visitor is actually charged is decided by the payment provider at checkout.
 * An amount is `null` until the owner approves it. A currency is offered only when every plan has an amount
 * in it, so the page never shows an invented price. To publish rupee prices, replace the INR `null` values
 * with whole-number amounts and ship.
 */
export type Currency = "INR" | "USD";
export type PlanId = "free" | "monthly" | "yearly";
export type Amounts = Record<Currency, number | null>;

export type Plan = {
  id: PlanId;
  name: string;
  period: string;
  amounts: Amounts;
  points: string[];
  highlight: boolean;
};

export const FREE_DAYS = 7;
export const TOTAL_DAYS = 120;
export const CURRENCIES: Currency[] = ["INR", "USD"];

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    period: "forever",
    amounts: { INR: 0, USD: 0 },
    points: [`Days 1 to ${FREE_DAYS} of Level 1`, "AI mentor review on your builds", "Gamified profile and XP"],
    highlight: false,
  },
  {
    id: "monthly",
    name: "Monthly",
    period: "per month",
    amounts: { INR: 699, USD: 7.49 },
    points: [`All ${TOTAL_DAYS} days across 4 levels`, "Public portfolio and verifiable certificates", "Bonus: daily interview question on WhatsApp", "Billed monthly"],
    highlight: false,
  },
  {
    id: "yearly",
    name: "Yearly",
    period: "per year",
    amounts: { INR: 3499, USD: 36.99 },
    points: [`All ${TOTAL_DAYS} days across 4 levels`, "Public portfolio and verifiable certificates", "Bonus: daily interview question on WhatsApp", "Billed yearly"],
    highlight: true,
  },
];

/** Currencies in which every plan has an amount. */
export function availableCurrencies(plans: Plan[] = PLANS): Currency[] {
  return CURRENCIES.filter((c) => plans.every((p) => p.amounts[c] !== null));
}

/** Reads a two-letter country code from headers that the hosting platform sets, never from the page. */
export function countryFromHeaders(h: { get(name: string): string | null }): string | null {
  const raw = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** India prefers rupees. Everyone else, and anyone whose country is unknown, prefers US dollars. */
export function currencyForCountry(country: string | null): Currency {
  return country === "IN" ? "INR" : "USD";
}

/** The preferred currency when it is offered, otherwise the first offered one. */
export function resolveCurrency(country: string | null, plans: Plan[] = PLANS): Currency {
  const wanted = currencyForCountry(country);
  const offered = availableCurrencies(plans);
  return offered.includes(wanted) ? wanted : (offered[0] ?? "USD");
}

/** Percentage saved by paying yearly instead of 12 monthly payments, or null when prices are not set. */
export function yearlySavingsPercent(currency: Currency, plans: Plan[] = PLANS): number | null {
  const monthly = plans.find((p) => p.id === "monthly")?.amounts[currency];
  const yearly = plans.find((p) => p.id === "yearly")?.amounts[currency];
  if (!monthly || !yearly) return null;
  const pct = Math.round((1 - yearly / (monthly * 12)) * 100);
  return pct > 0 ? pct : null;
}

export function formatAmount(amount: number, currency: Currency): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
