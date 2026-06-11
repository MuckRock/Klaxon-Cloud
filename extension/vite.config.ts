import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// The content build owns build/ and empties it on a one-shot prod build (it runs
// before the service-worker build, which appends with emptyOutDir:false). But in
// `dev:content` (vite build --watch) emptying would delete the service worker's
// build/background.js on every rebuild — and dev:content never regenerates it —
// breaking the loaded extension. So only empty when NOT watching.
const watching =
  process.argv.includes("--watch") || process.argv.includes("-w");

export default defineConfig({
  test: {
    environment: "happy-dom",
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
  ],
  publicDir: "static",
  build: {
    rolldownOptions: {
      input: "src/main.svelte.ts",
      output: {
        // Single IIFE bundle for content script injection
        format: "iife",
        entryFileNames: "content.js",
        dir: "build",
      },
    },
    // No asset hashing — Chrome extension files need stable names
    cssCodeSplit: false,
    emptyOutDir: !watching,
  },
  envPrefix: "MUCKROCK_",
});
