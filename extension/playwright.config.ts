import { defineConfig } from "@playwright/test";

// e2e tests load the *built* extension (build/chrome/) into a persistent
// Chromium context — see e2e/fixtures.ts. Chrome extension automation is
// Chromium-only, so there is no Firefox/WebKit project here.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  // The extension is loaded via a single persistent context; running specs in
  // parallel would fight over the same userDataDir, so keep it serial.
  workers: 1,
  fullyParallel: false,
  // Rebuild build/chrome/ once before any test so we're testing current source.
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
  },
});
