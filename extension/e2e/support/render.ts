import type { BrowserContext, Page, Worker } from "@playwright/test";

import { openPanel, signIn, signOut } from "../fixtures";
import { mockKlaxonApi, type ApiMockOptions, type ApiRequests } from "./api";
import { makeStoredAuth } from "./auth";

// Shared setup for the view/flow specs. The sidebar `<App>` now runs in the
// browser-native side panel (the extension page sidepanel.html), not injected
// into the host page — so each spec renders that panel page in a known auth
// state and drives it through real clicks. `page` stays the active host tab
// (where the on-page Canvas is injected and selection clicks land); the
// returned `panel` is the document every UI assertion runs against. Setup lives
// here so every view spec shares the same harness.

/**
 * Signed-out: no stored auth → authState stays idle → authenticated views fall
 * back to the Welcome sign-in prompt. Returns the panel page.
 */
export async function renderSignedOut(
  context: BrowserContext,
  page: Page,
  serviceWorker: Worker,
): Promise<Page> {
  await signOut(serviceWorker);
  return openPanel(context, page, serviceWorker);
}

/**
 * Signed-in: mock the API the service worker fetches, seed a valid auth record
 * (read once at boot), then open the panel. Returns the panel page plus the
 * captured create/update requests so flow tests can assert what was saved.
 */
export async function renderSignedIn(
  context: BrowserContext,
  page: Page,
  serviceWorker: Worker,
  options: ApiMockOptions = {},
): Promise<{ panel: Page; requests: ApiRequests }> {
  const requests = mockKlaxonApi(context, options);
  await signIn(serviceWorker, makeStoredAuth());
  const panel = await openPanel(context, page, serviceWorker);
  return { panel, requests };
}
