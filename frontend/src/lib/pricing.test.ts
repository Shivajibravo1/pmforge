import { describe, expect, it } from "vitest";
import {
  FREE_DAYS,
  PLANS,
  availableCurrencies,
  countryFromHeaders,
  currencyForCountry,
  formatAmount,
  resolveCurrency,
  yearlySavingsPercent,
  type Plan,
} from "./pricing";

const headers = (init: Record<string, string>) => new Headers(init);

describe("countryFromHeaders", () => {
  it("reads the Vercel country header", () => {
    expect(countryFromHeaders(headers({ "x-vercel-ip-country": "in" }))).toBe("IN");
  });
  it("falls back to the Cloudflare header", () => {
    expect(countryFromHeaders(headers({ "cf-ipcountry": "MY" }))).toBe("MY");
  });
  it("rejects malformed values", () => {
    expect(countryFromHeaders(headers({ "x-vercel-ip-country": "<script>" }))).toBeNull();
    expect(countryFromHeaders(headers({ "x-vercel-ip-country": "IND" }))).toBeNull();
    expect(countryFromHeaders(headers({}))).toBeNull();
  });
});

describe("currency choice", () => {
  it("prefers rupees for India and dollars elsewhere or when unknown", () => {
    expect(currencyForCountry("IN")).toBe("INR");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry(null)).toBe("USD");
  });
  it("offers only currencies where every plan has a price", () => {
    expect(availableCurrencies()).toEqual(["INR", "USD"]);
  });
  it("resolves rupees for India and dollars elsewhere", () => {
    expect(resolveCurrency("IN")).toBe("INR");
    expect(resolveCurrency("US")).toBe("USD");
    expect(resolveCurrency(null)).toBe("USD");
  });
  it("falls back to dollars when a currency has no complete price list", () => {
    const noInr: Plan[] = PLANS.map((p) => ({ ...p, amounts: { INR: p.id === "free" ? 0 : null, USD: p.amounts.USD } }));
    expect(resolveCurrency("IN", noInr)).toBe("USD");
  });
});

describe("prices", () => {
  it("matches the approved prices", () => {
    const m = PLANS.find((p) => p.id === "monthly")!.amounts;
    const y = PLANS.find((p) => p.id === "yearly")!.amounts;
    expect([m.INR, y.INR]).toEqual([699, 3499]);
    expect([m.USD, y.USD]).toEqual([7.49, 36.99]);
  });
  it("never holds a zero or negative paid amount", () => {
    for (const p of PLANS.filter((x) => x.id !== "free")) {
      for (const v of Object.values(p.amounts)) expect(v === null || v > 0).toBe(true);
    }
  });
  it("computes the yearly saving from the prices", () => {
    expect(yearlySavingsPercent("INR")).toBe(58);
    expect(yearlySavingsPercent("USD")).toBe(59);
  });
  it("formats amounts", () => {
    expect(formatAmount(0, "USD")).toBe("$0");
    expect(formatAmount(7.49, "USD")).toBe("$7.49");
    expect(formatAmount(36.99, "USD")).toBe("$36.99");
    expect(formatAmount(3499, "INR")).toContain("3,499");
  });
});

describe("free tier", () => {
  it("is 7 days", () => {
    expect(FREE_DAYS).toBe(7);
  });
});
