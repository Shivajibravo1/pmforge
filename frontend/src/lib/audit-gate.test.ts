import { describe, expect, it } from "vitest";
import { type AuditReport, type Exception, evaluate } from "../../scripts/audit-gate.ts";

const URL_A = "https://github.com/advisories/GHSA-aaaa";
const allow: Exception[] = [{ url: URL_A, reason: "test", expires: "2026-12-18" }];
const report = (url: string, severity: string): AuditReport => ({
  vulnerabilities: { pkg: { via: [{ url, severity, name: "pkg", title: "t" }, "other-pkg"] } },
});

describe("audit gate", () => {
  it("accepts an allowed advisory before its expiry", () => {
    const v = evaluate(report(URL_A, "high"), allow, "2026-11-18");
    expect(v.ok).toBe(true);
    expect(v.accepted).toHaveLength(1);
  });
  it("fails once the exception has expired", () => {
    const v = evaluate(report(URL_A, "high"), allow, "2026-12-19");
    expect(v.ok).toBe(false);
    expect(v.expired).toHaveLength(1);
  });
  it("fails on any other high or critical advisory", () => {
    expect(evaluate(report("https://github.com/advisories/GHSA-bbbb", "critical"), allow, "2026-11-18").ok).toBe(false);
    expect(evaluate(report("https://github.com/advisories/GHSA-bbbb", "high"), allow, "2026-11-18").blocking).toHaveLength(1);
  });
  it("ignores moderate and low advisories and derived dependency names", () => {
    expect(evaluate(report("https://github.com/advisories/GHSA-cccc", "moderate"), allow, "2026-11-18").ok).toBe(true);
    expect(evaluate({}, allow, "2026-11-18").ok).toBe(true);
  });
});
