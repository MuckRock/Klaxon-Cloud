import { defineConfig } from "vite";
import { BROWSERS } from "./scripts/manifest.mjs";

// Must match the target of the content build (see vite.config.ts): both emit
// into build/<browser>/ so each browser gets a self-contained, tailored bundle.
const browser = process.env.BROWSER ?? "chrome";
if (!BROWSERS.includes(browser)) {
  throw new Error(
    `BROWSER="${browser}" is not supported — expected one of ${BROWSERS.join(", ")}.`,
  );
}

export default defineConfig({
  build: {
    rolldownOptions: {
      input: "src/background.ts",
      output: {
        format: "esm",
        entryFileNames: "background.js",
        dir: `build/${browser}`,
      },
    },
    // Don't empty build/<browser>/ — the main config already populated it.
    emptyOutDir: false,
    copyPublicDir: false,
  },
  envPrefix: "MUCKROCK_",
});
