import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

/**
 * The specs assert Vietnamese copy, so the language has to be pinned.
 *
 * `src/i18n/index.ts` detects with `order: ["localStorage", "navigator"]` and
 * falls back to `en`. Nothing in the suite wrote the locale key, so the
 * language came from the browser's own `navigator.language` — `en-US` in a
 * default Chromium — and every Vietnamese locator silently missed against an
 * English UI. Seeding the key i18next reads makes the rendered language a
 * property of the suite rather than of whichever machine runs it.
 */
const LOCALE_STORAGE_STATE = {
  cookies: [],
  origins: [
    {
      origin: BASE_URL,
      localStorage: [{ name: "abridgeai.locale", value: "vi" }],
    },
  ],
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Every spec resets the same E2E database using the same fixed fixture IDs.
  // Running files concurrently races their DELETE/INSERT transactions and can
  // make otherwise unrelated tests fail nondeterministically.
  workers: 1,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: BASE_URL,
    storageState: LOCALE_STORAGE_STATE,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: "npm run dev -- --mode test",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
