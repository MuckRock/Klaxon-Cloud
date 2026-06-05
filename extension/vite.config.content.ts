import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Picker content script bundle. IIFE so it can be injected into a page via
// chrome.scripting.executeScript, with CSS injected into JS so the picker's
// overlay/ApertureBar styles work inside the shadow DOM it creates.
export default defineConfig({
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
      input: "src/picker.svelte.ts",
      output: {
        // Single IIFE bundle for content script injection
        format: "iife",
        entryFileNames: "content.js",
        dir: "build",
      },
    },
    // No asset hashing — Chrome extension files need stable names
    cssCodeSplit: false,
    // The `clean` script empties build/ once before any bundle runs, so no
    // single config owns emptying — otherwise running the three watch builds
    // in parallel races (this one would wipe the others' first output).
    emptyOutDir: false,
  },
  envPrefix: "MUCKROCK_",
});
