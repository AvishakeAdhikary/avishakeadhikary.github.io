import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 *   chromium / firefox / webkit  the static export (out/), served like GitHub Pages
 *   dev                          `next dev`: surfaces React's dev-only warnings
 *                                (duplicate keys, update loops, hydration)
 *   live                         the deployed site (post-deploy smoke)
 *
 * Every test fails on any console error or warning (see tests/e2e/fixtures.ts).
 */
const OUT_PORT = 3124;
const DEV_PORT = 3210;
const wantsDev = process.argv.some((a) => a === "--project=dev" || a === "dev");
const wantsLive = process.argv.some((a) => a === "--project=live" || a === "live");
// Web Audio renders through a fake sink at real-time rate instead of the OS device, so
// parallel browsers never contend for (or error on) the machine's sound card.
const CHROMIUM_ARGS = { args: ["--disable-audio-output"] };
const SITE_SPECS = /(routes|overlays|interactions|audio|achievements|arcade|a11y)\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 3 : 6,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${OUT_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: CHROMIUM_ARGS }, testMatch: SITE_SPECS },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testMatch: SITE_SPECS, testIgnore: /a11y\.spec/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testMatch: SITE_SPECS, testIgnore: /a11y\.spec/ },
    {
      name: "dev",
      use: { ...devices["Desktop Chrome"], launchOptions: CHROMIUM_ARGS, baseURL: `http://localhost:${DEV_PORT}` },
      testMatch: /(routes|overlays|achievements|arcade)\.spec\.ts/,
      timeout: 240_000,
      // One dev server compiles every page on demand: more parallel pages only starve it.
      workers: 2,
    },
    { name: "live", use: { ...devices["Desktop Chrome"], baseURL: "https://avishakeadhikary.github.io" }, testMatch: /live\.spec\.ts/ },
  ],
  webServer: wantsLive
    ? undefined
    : wantsDev
      ? { command: `npx next dev --turbopack -p ${DEV_PORT}`, url: `http://localhost:${DEV_PORT}/`, reuseExistingServer: !process.env.CI, timeout: 180_000 }
      : { command: `node scripts/serve-out.mjs ${OUT_PORT}`, url: `http://localhost:${OUT_PORT}/`, reuseExistingServer: !process.env.CI },
});
