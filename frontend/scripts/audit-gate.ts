/**
 * Dependency audit gate for CI.
 *
 * Fails on any high or critical advisory, except advisories listed in ALLOWED. Each exception
 * must name the advisory, why it is accepted, and an expiry date. After the expiry the gate fails
 * again, so an exception cannot be forgotten.
 *
 * Run: node --experimental-strip-types scripts/audit-gate.ts
 */
import { execFileSync } from "node:child_process";

export type Exception = { url: string; reason: string; expires: string };

export const ALLOWED: Exception[] = [
  {
    url: "https://github.com/advisories/GHSA-fc5q-39xc-vjpf",
    reason:
      "picomatch ReDoS through repeated extglobs. No patched release exists on npm (latest 4.0.7 is inside the affected range <=4.0.7). " +
      "The npm package is only reached through build and test tooling (vitest, vite, eslint) and is not in the runtime image. " +
      "Next 16.4.6 ships its own compiled copy in the runtime image; its version is not stated and npm audit cannot see it. " +
      "Re-check when Next or picomatch publishes a fix.",
    expires: "2026-12-18",
  },
];

type Via = { url?: string; severity?: string; name?: string; title?: string };
export type AuditReport = { vulnerabilities?: Record<string, { via: (string | Via)[] }> };
export type Verdict = { ok: boolean; blocking: string[]; accepted: string[]; expired: string[] };

const BLOCKING = new Set(["high", "critical"]);

export function evaluate(report: AuditReport, allowed: Exception[], today: string): Verdict {
  const found = new Map<string, Via>();
  for (const v of Object.values(report.vulnerabilities ?? {})) {
    for (const x of v.via) {
      if (typeof x === "object" && x.url && x.severity && BLOCKING.has(x.severity)) found.set(x.url, x);
    }
  }
  const blocking: string[] = [];
  const accepted: string[] = [];
  const expired: string[] = [];
  for (const [url, x] of found) {
    const rule = allowed.find((a) => a.url === url);
    const label = `${x.severity} ${x.name}: ${x.title} (${url})`;
    if (!rule) blocking.push(label);
    else if (rule.expires < today) expired.push(`${label} exception expired ${rule.expires}`);
    else accepted.push(`${label} accepted until ${rule.expires}`);
  }
  return { ok: blocking.length === 0 && expired.length === 0, blocking, accepted, expired };
}

function readAudit(): AuditReport {
  try {
    return JSON.parse(execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  } catch (e) {
    // npm audit exits non-zero when it finds anything; the JSON report is still on stdout.
    const out = (e as { stdout?: string }).stdout;
    if (out) return JSON.parse(out);
    throw e;
  }
}

if (process.argv[1]?.endsWith("audit-gate.ts")) {
  const verdict = evaluate(readAudit(), ALLOWED, new Date().toISOString().slice(0, 10));
  for (const l of verdict.accepted) console.log(`ACCEPTED  ${l}`);
  for (const l of verdict.expired) console.error(`EXPIRED   ${l}`);
  for (const l of verdict.blocking) console.error(`BLOCKING  ${l}`);
  console.log(verdict.ok ? "audit gate: pass" : "audit gate: FAIL");
  process.exit(verdict.ok ? 0 : 1);
}
