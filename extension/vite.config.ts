import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildManifest, BROWSERS } from "./scripts/manifest.mjs";

// Which browser this build targets. Chrome and Firefox need different manifests
// (see scripts/manifest.mjs), so each browser gets its own build/<browser>/ dir
// with a tailored manifest.json. Defaults to chrome for `npm run dev:content`.
const browser = process.env.BROWSER ?? "chrome";
if (!BROWSERS.includes(browser)) {
  throw new Error(
    `BROWSER="${browser}" is not supported — expected one of ${BROWSERS.join(", ")}.`,
  );
}
const outDir = `build/${browser}`;

// The content build owns build/<browser>/ and empties it on a one-shot prod
// build (it runs before the service-worker build, which appends with
// emptyOutDir:false). But in `dev:content` (vite build --watch) emptying would
// delete the service worker's background.js on every rebuild — and dev:content
// never regenerates it — breaking the loaded extension. So only empty when NOT
// watching.
const watching =
  process.argv.includes("--watch") || process.argv.includes("-w");

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
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
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
      input: "src/main.svelte.ts",
      output: {
        // Single IIFE bundle for content script injection
        format: "iife",
        entryFileNames: "content.js",
        dir: outDir,
      },
    },
    // No asset hashing — Chrome extension files need stable names
    cssCodeSplit: false,
    emptyOutDir: !watching,
  },
  envPrefix: "MUCKROCK_",
});
