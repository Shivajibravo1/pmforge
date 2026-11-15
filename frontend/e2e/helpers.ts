import { readFileSync } from "node:fs";
import { type Page, expect } from "@playwright/test";

export const EMAIL = "e2e@example.com";
const LOG = "/tmp/pmforge-e2e-frontend.log";

/** The local stack logs the one time code instead of emailing it. Take the latest one. */
export function latestCode(email: string): string {
  const hits = [...readFileSync(LOG, "utf8").matchAll(new RegExp(`sign-in code for ${email}: (\\d{6})`, "g"))];
  if (hits.length === 0) throw new Error("no sign-in code in the frontend log yet");
  return hits[hits.length - 1][1];
}

export async function signIn(page: Page, email = EMAIL) {
  await page.goto("/sign-in");
  await page.getByLabel("Work or personal email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel(/Enter the 6-digit code/)).toBeVisible();
  await expect.poll(() => { try { return latestCode(email); } catch { return ""; } }, { timeout: 15_000 }).toMatch(/\d{6}/);
  await page.getByLabel(/Enter the 6-digit code/).fill(latestCode(email));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL("**/app");
}

/** Step through every screen of a lesson, answering the journal screen without AI feedback. */
export async function reachFinale(page: Page, journalText?: string) {
  for (let guard = 0; guard < 20; guard++) {
    if (await page.getByRole("button", { name: /Mark complete|Completed/ }).isVisible()) return;
    const journal = page.getByLabel("Your answer");
    if (await journal.isVisible()) {
      if (journalText) await journal.fill(journalText);
      await page.getByRole("button", { name: /continue/i }).click();
      continue;
    }
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  throw new Error("lesson did not reach the finale");
}
