// Extension telemetry: Sentry only. The extension is a piece of client software
// running inside the user's browser, so we're deliberately conservative about
// what leaves the machine — see issue #110.
//
// What we send:
//   - Uncaught exceptions and unhandled promise rejections in the sidepanel and
//     background service worker. The Canvas content script (page.svelte.ts)
//     does NOT initialize Sentry — it runs inside the user's page and shouldn't
//     be reporting anything to us.
//
// DSN + environment are baked in at build time via Vite's `envPrefix: "MUCKROCK_"`:
//   MUCKROCK_ENVIRONMENT — "production" | "staging" | "development" (default: development).
//                          Shared with any other integration that wants to know
//                          which deploy this build is for.
//   MUCKROCK_SENTRY_DSN  — full DSN from the Sentry "Klaxon Extension" project

import * as Sentry from "@sentry/browser";

const DSN = import.meta.env.MUCKROCK_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MUCKROCK_ENVIRONMENT ?? "development";

/**
 * Version from the manifest. Sentry uses `release` to correlate events with
 * source maps and to filter by ship. Read from chrome.runtime so it stays in
 * sync with what the store actually installed.
 */
function release(): string | undefined {
  try {
    return chrome.runtime.getManifest?.().version;
  } catch {
    return undefined;
  }
}

export function initSentry(context: "sidepanel" | "background"): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: release(),
    // Tag every event with which realm produced it so the two bundles are
    // separable in Sentry's UI.
    initialScope: { tags: { extension_context: context } },
    sendDefaultPii: false,
    // No tracing or session tracking — errors only.
    tracesSampleRate: 0,
  });
}
