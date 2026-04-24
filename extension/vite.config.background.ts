import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: "src/background.ts",
      output: {
        format: "esm",
        entryFileNames: "background.js",
        dir: "build",
      },
    },
    // Don't empty build/ — the main config already populated it.
    emptyOutDir: false,
    copyPublicDir: false,
  },
  envPrefix: "MUCKROCK_",
});
