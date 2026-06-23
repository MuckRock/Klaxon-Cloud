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

export function buildManifest(browser, { omitKey = false } = {}) {
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
  // The Chrome Web Store rejects any manifest carrying a `key`, so store-bound
  // builds omit it. The source key stays in manifest/chrome.json, so that
  // dev/unpacked loads keep a pinned, stable extension ID, and redirect-uris.mjs
  // still derives the production redirect URI from it.
  // The published ID matches because the key is the public key the Web Store assigned this item.
  if (omitKey) delete manifest.key;
  return manifest;
}
