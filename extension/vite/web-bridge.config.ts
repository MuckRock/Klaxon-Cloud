import { defineConfig } from "vite";
import { BROWSERS } from "../scripts/manifest.mjs";

// Web-bridge content script bundle. Declared in the manifest to run on the
// companion web app's origin (src/web-bridge.ts → build/<browser>/web-bridge.js),
// it announces the extension's presence and relays "create alert" handoffs to
// the service worker. Like page.config.ts it emits a single stable-named IIFE
// (the name is listed in the manifest, so no hashing/splitting). It owns none of
// build/<browser>/ — publicDir and manifest writing stay with page.config.ts;
// this config appends with emptyOutDir:false.
const browser = process.env.BROWSER ?? "chrome";
if (!BROWSERS.includes(browser)) {
  throw new Error(
    `BROWSER="${browser}" is not supported — expected one of ${BROWSERS.join(", ")}.`,
  );
}
const outDir = `build/${browser}`;

export default defineConfig({
  build: {
    rolldownOptions: {
      input: "src/web-bridge.ts",
      output: {
        // Single IIFE bundle for content script injection
        format: "iife",
        entryFileNames: "web-bridge.js",
        dir: outDir,
      },
    },
    // No asset hashing — Chrome extension files need stable names
    cssCodeSplit: false,
    // The `clean` script owns emptying build/<browser>/.
    emptyOutDir: false,
    copyPublicDir: false,
  },
  envPrefix: "MUCKROCK_",
});
