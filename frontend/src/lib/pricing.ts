/**
 * Landing page pricing and currency selection.
 *
 * Display only: the amount a visitor is actually charged is decided by the payment provider at checkout.
 * Amounts are `null` until the owner approves them, and the page then says "Pricing announced at launch"
 * instead of showing an invented number. To publish prices, replace `null` with whole-number amounts
 * (INR in rupees, USD in dollars) and ship.
 */
export type Currency = "INR" | "USD";
export type PlanId = "free" | "monthly" | "yearly";
export type Amounts = Record<Currency, number> | null;

export type Plan = {
  id: PlanId;
  name: string;
  period: string;
  amounts: Amounts;
  points: string[];
  highlight: boolean;
};

export const FREE_DAYS = 10;
export const TOTAL_DAYS = 120;

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
    amounts: null,
    points: [`All ${TOTAL_DAYS} days across 4 levels`, "Public portfolio and verifiable certificates", "Billed monthly"],
    highlight: false,
  },
  {
    id: "yearly",
    name: "Yearly",
    period: "per year",
    amounts: null,
    points: [`All ${TOTAL_DAYS} days across 4 levels`, "Public portfolio and verifiable certificates", "Billed yearly"],
    highlight: true,
  },
];

/** Reads a two-letter country code from headers that the hosting platform sets, never from the page. */
export function countryFromHeaders(h: { get(name: string): string | null }): string | null {
  const raw = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** India sees rupees. Everyone else, and anyone whose country is unknown, sees US dollars. */
export function currencyForCountry(country: string | null): Currency {
  return country === "IN" ? "INR" : "USD";
}

export function formatAmount(amount: number, currency: Currency): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
