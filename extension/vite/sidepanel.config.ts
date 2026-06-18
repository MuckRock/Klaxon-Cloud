import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { BROWSERS } from "../scripts/manifest.mjs";

// Side-panel page bundle. Unlike the page content script, this is a normal HTML
// extension page (Chrome `sidePanel` / Firefox `sidebarAction`), so CSS is
// extracted to a file and linked from the built sidepanel.html — there's no
// shadow DOM to inject into.
const browser = process.env.BROWSER ?? "chrome";
if (!BROWSERS.includes(browser)) {
  throw new Error(
    `BROWSER="${browser}" is not supported — expected one of ${BROWSERS.join(", ")}.`,
  );
}

export default defineConfig({
  resolve: {
    conditions: ["browser"],
  },
  plugins: [svelte()],
  build: {
    rolldownOptions: {
      input: "sidepanel.html",
    },
    outDir: `build/${browser}`,
    // The page config owns emptying build/<browser>/ and copying static/.
    emptyOutDir: false,
    copyPublicDir: false,
  },
  envPrefix: "MUCKROCK_",
});
