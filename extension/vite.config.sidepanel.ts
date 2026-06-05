import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Side-panel page bundle. Unlike the content script, this is a normal HTML
// extension page, so CSS is extracted to a file and linked from the built
// sidepanel.html (no shadow DOM to inject into).
export default defineConfig({
  plugins: [svelte()],
  build: {
    rolldownOptions: {
      input: "sidepanel.html",
    },
    outDir: "build",
    // The content-script build owns emptying build/ and copying static/.
    emptyOutDir: false,
    copyPublicDir: false,
  },
  envPrefix: "MUCKROCK_",
});
