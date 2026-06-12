import type { StoredAuth } from "../src/lib/types";
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// `chrome` is the extension service-worker global. e2e/tsconfig.json doesn't
// load @types/chrome (this is Node, not the browser), so declare it loosely.
// The callback bodies below run in the SW, not in this Node process.
declare const chrome: any;

const here = dirname(fileURLToPath(import.meta.url));
const pathToExtension = resolve(here, "..", "build");

/**
 * Loads the *built* extension into a persistent Chromium context and exposes
 * its service worker. Chrome extension automation is Chromium-only and uses a
 * persistent context (per the Playwright chrome-extensions doc).
 */
export const test = base.extend<{
  context: BrowserContext;
  serviceWorker: Worker;
}>({
  context: async ({}, use) => {
    const userDataDir = mkdtempSync(resolve(tmpdir(), "klaxon-e2e-"));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  },

  serviceWorker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent("serviceworker");
    await use(sw);
  },
});

export const expect = test.expect;

/** Seed the signed-in auth record the service worker reads on `auth/state`. */
export async function signIn(serviceWorker: Worker, stored: StoredAuth) {
  await serviceWorker.evaluate(async (value) => {
    await chrome.storage.local.set({ muckrock_auth: value });
  }, stored);
}

/** Clear any stored auth so the UI renders the signed-out Welcome state. */
export async function signOut(serviceWorker: Worker) {
  await serviceWorker.evaluate(async () => {
    await chrome.storage.local.remove("muckrock_auth");
  });
}

export const TEST_PAGE_URL = "https://klaxon.test/";

export const TEST_PAGE_HTML = readFileSync(
  resolve(here, "support", "test-page.html"),
  "utf8",
);

/**
 * Navigate to the throwaway test page (fulfilled locally) and inject the
 * content script — replicating what the action-button click does in
 * background.ts, which Playwright can't trigger directly.
 */
export async function openSidebar(page: Page, serviceWorker: Worker) {
  await page.route(`${TEST_PAGE_URL}**`, (route) =>
    route.fulfill({ contentType: "text/html", body: TEST_PAGE_HTML }),
  );
  await page.goto(TEST_PAGE_URL);

  await serviceWorker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id) throw new Error("no active tab to inject into");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  });
}
