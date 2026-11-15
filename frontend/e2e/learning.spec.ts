import { expect, test } from "@playwright/test";
import { reachFinale, signIn } from "./helpers";

test.skip(!!process.env.E2E_BASE_URL, "needs the local stack to read sign-in codes");

test("a wrong code is rejected", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Work or personal email").fill("e2e@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel(/Enter the 6-digit code/).fill("000000");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.getByText("That code is not valid or has expired.")).toBeVisible();
});

test("sign in, finish Day 1, see the XP toast and badge, then see the note on Day 2", async ({ page }) => {
  await signIn(page);

  await page.goto("/app/lesson/1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Completed, reviewing")).toHaveCount(0);

  const note = "My Day 1 note: the sponsor owns the outcome and I own the plan.";
  await reachFinale(page, note);
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByRole("status").filter({ hasText: "XP" })).toContainText("+10 XP");
  await expect(page.getByRole("button", { name: "Completed" })).toBeDisabled();

  // The badge and button state survive a reload because they come from the server.
  await page.reload();
  await expect(page.getByText("Completed, reviewing")).toBeVisible();
  await reachFinale(page);
  await expect(page.getByRole("button", { name: "Completed" })).toBeDisabled();

  // Day 2 is unlocked and offers the earlier note.
  await page.goto("/app/lesson/2");
  await page.getByRole("button", { name: /Notes from earlier lessons/ }).click();
  await expect(page.getByText(note)).toBeVisible();
});

test("a later lesson stays locked until the one before it is done", async ({ page }) => {
  await signIn(page, "e2e@example.com");
  await page.goto("/app/lesson/9");
  await expect(page.getByText("Complete the previous lesson first.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark complete" })).toHaveCount(0);
});
