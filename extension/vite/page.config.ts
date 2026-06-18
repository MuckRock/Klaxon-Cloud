import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildManifest, BROWSERS } from "../scripts/manifest.mjs";

// Page content script bundle. Injected on demand into the active tab, it hosts
// the on-page Canvas picker (src/lib/canvas.svelte.ts) inside a shadow root and
// runs the port server the side panel's CanvasClient connects to.
//
// This config owns build/<browser>/: it copies the shared static assets
// (publicDir) and writes the per-browser manifest.json (klaxon-manifest plugin).
// The sidepanel and background configs append into the same dir with
// emptyOutDir:false. A one-shot `npm run clean` empties build/<browser>/ before
// any of the three runs, so none of them needs (or may) own emptying — running
// the three watch builds in parallel would otherwise race.
const browser = process.env.BROWSER ?? "chrome";
if (!BROWSERS.includes(browser)) {
  throw new Error(
    `BROWSER="${browser}" is not supported — expected one of ${BROWSERS.join(", ")}.`,
  );
}
const outDir = `build/${browser}`;

// Generate the browser-specific manifest.json into the output dir. publicDir
// only copies the shared static assets (icons, fonts); the manifest is merged
// here so each browser gets the keys it expects and nothing else.
function manifestPlugin() {
  return {
    name: "klaxon-manifest",
    closeBundle() {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "manifest.json"),
        JSON.stringify(buildManifest(browser), null, 2) + "\n",
      );
    },
  };
}

export default defineConfig({
  resolve: {
    conditions: ["browser"],
  },
  plugins: [
    svelte({
      compilerOptions: {
        // Inject CSS into JS so it works inside shadow DOM
        css: "injected",
      },
    }),
    manifestPlugin(),
  ],
  publicDir: "static",
  build: {
    rolldownOptions: {
      input: "src/page.svelte.ts",
      output: {
        // Single IIFE bundle for content script injection
        format: "iife",
        entryFileNames: "page.js",
        dir: outDir,
      },
    },
    // No asset hashing — Chrome extension files need stable names
    cssCodeSplit: false,
    // The `clean` script owns emptying build/<browser>/ (see header).
    emptyOutDir: false,
  },
  envPrefix: "MUCKROCK_",
});
