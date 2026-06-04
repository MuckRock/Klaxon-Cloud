import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
  },
  // Use Svelte's browser entry points under Vitest so runes in `.svelte.ts`
  // modules compile when imported from tests (per Svelte testing docs).
  resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined,
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
  },
  envPrefix: "MUCKROCK_",
});
