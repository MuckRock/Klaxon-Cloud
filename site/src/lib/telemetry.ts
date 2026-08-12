// Sentry + Plausible configuration shared between server hooks, client hooks,
// and the root layout.
//
// ENVIRONMENT is baked in at build time from WORKERS_CI_BRANCH (Cloudflare
// Workers Builds sets this to the branch name; local builds see it unset). The
// mapping — "main" → production, any other branch → staging, unset →
// development — lives in vite.config.ts as a Vite `define`. See that file for
// the "why here, not a wrapper script" note.
//
// SENTRY_DSN is a `$env/static/public` value (Sentry DSNs are safe to embed),
// set in the Cloudflare dashboard as PUBLIC_MUCKROCK_SENTRY_DSN. One value for
// all deploys; environment tagging separates the streams in Sentry's UI.

import { PUBLIC_MUCKROCK_SENTRY_DSN } from "$env/static/public";

export const ENVIRONMENT: string = __KLAXON_ENVIRONMENT__;

export const SENTRY_DSN: string = PUBLIC_MUCKROCK_SENTRY_DSN ?? "";

/** Whether Sentry is configured for this build. */
export const SENTRY_ENABLED: boolean = SENTRY_DSN.length > 0;

/** Plausible only runs on production — staging/dev traffic would pollute stats. */
export const PLAUSIBLE_ENABLED: boolean = ENVIRONMENT === "production";

export const PLAUSIBLE_DOMAIN = "klaxoncloud.org";
