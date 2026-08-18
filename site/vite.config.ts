import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { playwright } from "@vitest/browser-playwright";
import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";

// Deploy environment for Sentry + Plausible, derived from Cloudflare Workers
// Builds' WORKERS_CI_BRANCH (a build-only env var Cloudflare injects). Baked
// into every bundle via Vite `define` so both hooks.server.ts and hooks.client.ts.
// Local `vite dev` / `vite build` leaves WORKERS_CI_BRANCH unset.
function deployEnvironment(): "production" | "staging" | "development" {
  const branch = process.env.WORKERS_CI_BRANCH;
  if (branch === "main") return "production";
  if (branch) return "staging"; // any non-main branch → preview deploy
  return "development";
}

// Sentry DSN, baked in the same way as the environment. Read through
// Vite's loadEnv (local site/.env, or a Cloudflare Workers Builds environment
// variable, which wins) rather than `$env/static/public` — a named import from
// that virtual module fails the build outright when the variable is unset,
// which is exactly the case for a fresh checkout or an unconfigured project.
function sentryDsn(mode: string): string {
  const env = loadEnv(mode, import.meta.dirname, "PUBLIC_");
  return env.PUBLIC_MUCKROCK_SENTRY_DSN ?? "";
}

export default defineConfig(({ mode }) => ({
  plugins: [
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },
      adapter: adapter(),
    }),
  ],
  define: {
    __KLAXON_ENVIRONMENT__: JSON.stringify(deployEnvironment()),
    __KLAXON_SENTRY_DSN__: JSON.stringify(sentryDsn(mode)),
  },
  // @klaxon/lib ships raw .ts (no build step); inline it so SSR and vitest
  // transpile it rather than treating the workspace package as built ESM.
  ssr: { noExternal: ["@klaxon/lib"] },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", headless: true }],
          },
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**"],
        },
      },

      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
}));
