// Sentry + Plausible configuration shared between server hooks, client hooks,
// and the root layout. Values are read from $env/static/public and baked in at
// build time (Sentry DSNs are public by design). Set them per environment
// before running `vite build` — locally via .env, in CI via the deploy pipeline.
//
//   PUBLIC_MUCKROCK_ENVIRONMENT — one of "production" | "staging" | "development".
//                                 Shared by Sentry (as `environment` tag) and
//                                 Plausible (only "production" reports pageviews).
//   PUBLIC_MUCKROCK_SENTRY_DSN  — full DSN from the Sentry project

import {
  PUBLIC_MUCKROCK_ENVIRONMENT,
  PUBLIC_MUCKROCK_SENTRY_DSN,
} from "$env/static/public";

export const ENVIRONMENT: string = PUBLIC_MUCKROCK_ENVIRONMENT ?? "development";

export const SENTRY_DSN: string = PUBLIC_MUCKROCK_SENTRY_DSN ?? "";

/** Whether Sentry is configured for this build. */
export const SENTRY_ENABLED: boolean = SENTRY_DSN.length > 0;

/** Plausible only runs on production — staging/dev traffic would pollute stats. */
export const PLAUSIBLE_ENABLED: boolean = ENVIRONMENT === "production";

export const PLAUSIBLE_DOMAIN = "klaxoncloud.org";
