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
// e2e is Chromium-only, so it loads the Chrome build.
const pathToExtension = resolve(here, "..", "build", "chrome");

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
 * Open the sidebar the way the new native-panel paradigm splits it across two
 * realms, and hand back the panel page the UI lives in.
 *
 * The sidebar `<App>` is no longer injected into the host page — it's the
 * extension-origin document `sidepanel.html`. The on-page Canvas (the element
 * picker) is still a content script (`page.js`), injected into the host tab on
 * demand by the service worker. So the harness runs two pages:
 *
 *   - `page`  — the host web page (the throwaway test page, fulfilled locally),
 *               kept as the *active* tab so the panel's CanvasClient resolves
 *               its `active` / `lastFocusedWindow` query to it (not to the panel
 *               document). This is also where selection clicks land.
 *   - panel   — a background tab navigated to `chrome-extension://<id>/
 *               sidepanel.html`, where every UI assertion runs. Playwright drives
 *               a background tab fine; what matters is that the *host* stays the
 *               active tab so origin/watchable track the page being inspected.
 *
 * The panel can't be driven through the real browser side-panel chrome (it isn't
 * a tab), but `sidepanel.html` is an ordinary extension page, so opening it
 * directly renders the same `<App>` + `CanvasClient` it would in the panel.
 */
export async function openPanel(
  context: BrowserContext,
  page: Page,
  serviceWorker: Worker,
): Promise<Page> {
  // Fulfill every top-level http(s) document with the throwaway test page. The
  // initial goto lands on TEST_PAGE_URL, but ViewAlert drives the tab to an
  // alert's real `site` (issue #71) via CanvasClient.navigateTab — serving them
  // all locally keeps that navigation off the network and on a page the Canvas
  // can inject into. SW API calls are mocked separately (context.route).
  await page.route(/^https?:\/\//, (route) =>
    route.fulfill({ contentType: "text/html", body: TEST_PAGE_HTML }),
  );
  await page.goto(TEST_PAGE_URL);

  const extensionId = new URL(serviceWorker.url()).host;
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  // Opening the panel made it the active tab; hand activity back to the host so
  // the CanvasClient connects to (and tracks) the page under inspection. The
  // resulting `tabs.onActivated` is what drives the panel onto the host's origin.
  await page.bringToFront();

  return panel;
}
