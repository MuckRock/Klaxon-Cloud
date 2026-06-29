import { defineConfig } from "vitest/config";

// Shared library unit tests. Pure logic (OIDC helpers, URL/payload builders,
// utils, fixtures) — no DOM, so a node environment is enough.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
