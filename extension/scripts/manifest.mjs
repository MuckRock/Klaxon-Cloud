// Builds the per-browser manifest by merging the shared base with a thin
// browser overlay. Chrome and Firefox disagree on a few keys, and shipping a
// single combined manifest makes each browser warn about the other's keys.
// The overlay supplies the full `background` block plus its browser-only keys,
// so a shallow merge over the base is all we need — except `permissions`, which
// is unioned so an overlay can add a browser-only permission (e.g. Chrome's
// `sidePanel`) without dropping the shared ones.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const BROWSERS = ["chrome", "firefox"];

const MANIFEST_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "manifest",
);

function read(name) {
  return JSON.parse(readFileSync(join(MANIFEST_DIR, `${name}.json`), "utf8"));
}

/** Appended to every user-visible label in a dev build (see the `dev` option). */
export const DEV_SUFFIX = " (dev)";

/**
 * @param {string} browser
 * @param {{ omitKey?: boolean, grantHost?: boolean, hosts?: string[], webOrigin?: string, dev?: boolean }} [options]
 */
export function buildManifest(
  browser,
  {
    omitKey = false,
    grantHost = false,
    hosts = [],
    webOrigin = "",
    dev = false,
  } = {},
) {
  if (!BROWSERS.includes(browser)) {
    throw new Error(
      `Unknown browser "${browser}" — expected one of ${BROWSERS.join(", ")}.`,
    );
  }
  const base = read("base");
  const overlay = read(browser);
  const permissions = [
    ...new Set([...(base.permissions ?? []), ...(overlay.permissions ?? [])]),
  ];
  const manifest = { ...base, ...overlay, permissions };
  // A local dev build and the installed store build sit side by side in the
  // browser under the same name and icon, which makes it guesswork which one a
  // toolbar button or a chrome://extensions row belongs to. Dev builds suffix
  // every user-visible label; their icons are swapped separately by the
  // static-dev/ overlay (see vite/page.config.ts). Keyed off DEV_BUILD, so this
  // never touches a shipped build.
  if (dev) {
    manifest.name += DEV_SUFFIX;
    // Hover title on the toolbar button (Chrome) and the sidebar (Firefox).
    for (const key of ["action", "sidebar_action"]) {
      const title = manifest[key]?.default_title;
      if (title)
        manifest[key] = { ...manifest[key], default_title: title + DEV_SUFFIX };
    }
  }
  // The Chrome Web Store rejects any manifest carrying a `key`, so store-bound
  // builds omit it. The source key stays in manifest/chrome.json, so that
  // dev/unpacked loads keep a pinned, stable extension ID, and redirect-uris.mjs
  // still derives the production redirect URI from it.
  // The published ID matches because the key is the public key the Web Store assigned this item.
  if (omitKey) delete manifest.key;
  // e2e ONLY: loads the extension unpacked and can't drive the native optional-
  // permission prompt, so promote optional host access to install-time
  // host_permissions (auto-granted for unpacked loads). requestWatch() then
  // sees the origin already granted and resolves true without a prompt, so the
  // real flow still runs. Never set for shipped builds — that's the whole point
  // of the optional split (see plans/optional-host-permissions.md).
  if (grantHost && manifest.optional_host_permissions) {
    manifest.host_permissions = manifest.optional_host_permissions;
    delete manifest.optional_host_permissions;
  } else if (hosts.length) {
    // Backend hosts the service worker fetches directly (Squarelet OIDC/JWT and
    // the DocumentCloud API). A host permission matching the request URL exempts
    // the extension's cross-origin fetch from CORS, so the SW can read the
    // response even when the server sends no Access-Control-Allow-Origin (the
    // Squarelet /openid/token endpoint doesn't). These are narrow, named hosts —
    // they don't trigger the Web Store broad-host review the way the optional
    // `*://*/*` page access would. Derived from env at build time so each
    // environment's manifest carries only the backend it actually talks to.
    manifest.host_permissions = [
      ...new Set([...(manifest.host_permissions ?? []), ...hosts]),
    ];
  }
  // Declared content script for the companion web app. The match pattern is the
  // web app's own origin (env-driven at build time so each environment injects
  // only into its own site). A declared content script grants its own injection
  // on the matched origin, so no extra host permission is needed. web-bridge.js
  // announces the extension's presence and relays "create alert" handoffs.
  if (webOrigin) {
    manifest.content_scripts = [
      ...(manifest.content_scripts ?? []),
      {
        matches: [`${webOrigin.replace(/\/$/, "")}/*`],
        js: ["web-bridge.js"],
        run_at: "document_idle",
      },
    ];
  }
  return manifest;
}
