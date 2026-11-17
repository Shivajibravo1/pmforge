import { describe, expect, it } from "vitest";
import { enrollmentErrors, isEnrolled, normalizeName, normalizePhone } from "./enrollment";

describe("normalizeName", () => {
  it("trims and collapses spaces", () => expect(normalizeName("  Asha   Rao ")).toBe("Asha Rao"));
  it("accepts non-Latin scripts, apostrophes and hyphens", () => {
    expect(normalizeName("அருண் குமார்")).toBe("அருண் குமார்");
    expect(normalizeName("Mary-Jane O'Neil")).toBe("Mary-Jane O'Neil");
  });
  it("rejects too short, too long, markup, digits", () => {
    expect(normalizeName("A")).toBeNull();
    expect(normalizeName("a".repeat(81))).toBeNull();
    expect(normalizeName("<script>x</script>")).toBeNull();
    expect(normalizeName("Bot 123")).toBeNull();
    expect(normalizeName("")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("normalizes separators to E.164", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("+1 (415) 555 0100")).toBe("+14155550100");
  });
  it("requires a country code", () => {
    expect(normalizePhone("9876543210")).toBeNull();
    expect(normalizePhone("09876543210")).toBeNull();
  });
  it("rejects bad lengths and characters", () => {
    expect(normalizePhone("+91")).toBeNull();
    expect(normalizePhone("+1234567")).toBeNull();
    expect(normalizePhone("+1234567890123456")).toBeNull();
    expect(normalizePhone("+91abc4567890")).toBeNull();
    expect(normalizePhone("+0123456789")).toBeNull();
  });
});

describe("enrollment", () => {
  it("reports each bad field", () => {
    expect(Object.keys(enrollmentErrors({ name: "", phone: "" })).sort()).toEqual(["name", "phone"]);
    expect(enrollmentErrors({ name: "Asha Rao", phone: "+919876543210" })).toEqual({});
  });
  it("detects an incomplete user", () => {
    expect(isEnrolled(null)).toBe(false);
    expect(isEnrolled({ name: "Asha Rao", phone: null })).toBe(false);
    expect(isEnrolled({ name: "", phone: "+919876543210" })).toBe(false);
    expect(isEnrolled({ name: "Asha Rao", phone: "+919876543210" })).toBe(true);
  });
});
