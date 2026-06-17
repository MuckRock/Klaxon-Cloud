// Empties build/<browser>/ once before any of the three build configs run.
// With three parallel watch builds (dev) no single config can own emptyOutDir
// without racing the others' first output, so emptying is a separate up-front
// step. BROWSER selects the dir (default chrome), matching the build configs.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BROWSERS } from "./manifest.mjs";

const browser = process.env.BROWSER ?? "chrome";
if (!BROWSERS.includes(browser)) {
  throw new Error(
    `BROWSER="${browser}" is not supported — expected one of ${BROWSERS.join(", ")}.`,
  );
}

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "build",
  browser,
);
rmSync(target, { recursive: true, force: true });
