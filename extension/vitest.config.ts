import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// Test config, separate from the three build configs under vite/ so none of
// them has to double as the default vite config. Vitest auto-resolves this file.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ["browser"],
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
  envPrefix: "MUCKROCK_",
});
