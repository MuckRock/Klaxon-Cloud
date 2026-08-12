// Sentry + Plausible configuration shared between server hooks, client hooks,
// and the root layout.
//
// Both values are baked in at build time by Vite `define`s in vite.config.ts —
// see that file for the "why here, not a wrapper script" note.
//
// ENVIRONMENT comes from WORKERS_CI_BRANCH (Cloudflare Workers Builds sets this
// to the branch name; local builds see it unset): "main" → production, any
// other branch → staging, unset → development.
//
// SENTRY_DSN comes from PUBLIC_MUCKROCK_SENTRY_DSN (Sentry DSNs are safe to
// embed), set in the Cloudflare dashboard under Settings → Build → Environment
// variables. One value for all deploys; environment tagging separates the
// streams in Sentry's UI. Unset builds get "" and skip Sentry entirely.

export const ENVIRONMENT: string = __KLAXON_ENVIRONMENT__;

export const SENTRY_DSN: string = __KLAXON_SENTRY_DSN__;

/** Whether Sentry is configured for this build. */
export const SENTRY_ENABLED: boolean = SENTRY_DSN.length > 0;

/** Plausible only runs on production — staging/dev traffic would pollute stats. */
export const PLAUSIBLE_ENABLED: boolean = ENVIRONMENT === "production";

export const PLAUSIBLE_DOMAIN = "klaxoncloud.org";
