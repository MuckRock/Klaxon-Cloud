import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// Test config, separate from the three build configs so none of them has to
// double as the default vite config. Vitest auto-resolves this file.
export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: "happy-dom",
  },
  envPrefix: "MUCKROCK_",
});
