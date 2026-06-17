// Builds the per-browser manifest by merging the shared base with a thin
// browser overlay. Chrome and Firefox disagree on a few keys, and shipping a
// single combined manifest makes each browser warn about the other's keys.
// The overlay supplies the full `background` block plus its browser-only keys,
// so a shallow merge over the base is all we need.

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

export function buildManifest(browser) {
  if (!BROWSERS.includes(browser)) {
    throw new Error(
      `Unknown browser "${browser}" — expected one of ${BROWSERS.join(", ")}.`,
    );
  }
  return { ...read("base"), ...read(browser) };
}
