import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
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
  },
  envPrefix: "MUCKROCK_",
});
