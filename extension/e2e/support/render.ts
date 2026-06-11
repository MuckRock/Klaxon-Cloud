import type { BrowserContext, Page, Worker } from "@playwright/test";

import { openSidebar, signIn, signOut } from "../fixtures";
import { mockKlaxonApi, type ApiMockOptions, type ApiRequests } from "./api";
import { makeStoredAuth } from "./auth";

// Shared setup for the view/flow specs. Each test renders the injected sidebar
// (open shadow DOM on #klaxon-host) in a known auth state, then drives the UI
// through real clicks. Playwright locators pierce open shadow roots, so specs
// assert on the UI without any shadow-specific traversal.

/**
 * Signed-out: no stored auth → authState stays idle → authenticated views fall
 * back to the Welcome sign-in prompt.
 */
export async function renderSignedOut(page: Page, serviceWorker: Worker) {
  await signOut(serviceWorker);
  await openSidebar(page, serviceWorker);
}

/**
 * Signed-in: mock the API the service worker fetches, seed a valid auth record
 * (read once at boot), then inject the sidebar. Returns the captured create/
 * update requests so flow tests can assert what was saved.
 */
export async function renderSignedIn(
  context: BrowserContext,
  page: Page,
  serviceWorker: Worker,
  options: ApiMockOptions = {},
): Promise<ApiRequests> {
  const requests = mockKlaxonApi(context, options);
  await signIn(serviceWorker, makeStoredAuth());
  await openSidebar(page, serviceWorker);
  return requests;
}
