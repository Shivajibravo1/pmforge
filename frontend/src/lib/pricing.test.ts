import { describe, expect, it } from "vitest";
import { PLANS, countryFromHeaders, currencyForCountry, formatAmount } from "./pricing";

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

describe("currencyForCountry", () => {
  it("uses rupees for India and dollars elsewhere or when unknown", () => {
    expect(currencyForCountry("IN")).toBe("INR");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry(null)).toBe("USD");
  });
});

describe("formatAmount", () => {
  it("formats each currency", () => {
    expect(formatAmount(0, "USD")).toBe("$0");
    expect(formatAmount(1499, "INR")).toContain("1,499");
  });
});

describe("plans", () => {
  it("never shows an invented amount for paid plans", () => {
    for (const p of PLANS.filter((x) => x.id !== "free")) {
      expect(p.amounts === null || (p.amounts.INR > 0 && p.amounts.USD > 0)).toBe(true);
    }
  });
});
