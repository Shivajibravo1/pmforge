import { expect, test } from "@playwright/test";

test("sign in page loads with the email step", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /Sign in to PM/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a code" })).toBeVisible();
});

test("signed out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/app/course");
  await page.waitForURL("**/sign-in");
});
