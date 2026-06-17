import { defineConfig } from "vite";
import { BROWSERS } from "../scripts/manifest.mjs";

// Service worker bundle. Emits into the same build/<browser>/ dir as the page
// and sidepanel configs (each browser gets a self-contained, tailored bundle).
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
    // The page config owns emptying build/<browser>/.
    emptyOutDir: false,
    copyPublicDir: false,
  },
  envPrefix: "MUCKROCK_",
});
