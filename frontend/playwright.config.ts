import { defineConfig } from "@playwright/test";

// The Playwright browser download is not always reachable, so tests run on an installed Chrome.
// Set E2E_BASE_URL to run only the public smoke tests against a deployed site.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: external ?? "http://localhost:3100",
    channel: process.env.E2E_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
  },
  webServer: external ? undefined : {
    command: "bash e2e/stack.sh",
    url: "http://localhost:3100/sign-in",
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
