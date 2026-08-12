// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { PlausibleEventOptions } from "@plausible-analytics/tracker";
import type { SessionTokens } from "$lib/server/session";

declare global {
  /**
   * Deploy environment ("production" | "staging" | "development"), injected by
   * Vite `define` from WORKERS_CI_BRANCH at build time. Read via
   * `$lib/telemetry.ENVIRONMENT`, not directly.
   */
  const __KLAXON_ENVIRONMENT__: string;

  /**
   * Sentry DSN, injected by Vite `define` from PUBLIC_MUCKROCK_SENTRY_DSN at
   * build time; "" when unset. Read via `$lib/telemetry.SENTRY_DSN`, not
   * directly.
   */
  const __KLAXON_SENTRY_DSN__: string;

  interface Window {
    plausible?: (eventName: string, options?: PlausibleEventOptions) => void;
  }

  namespace App {
    // interface Error {}
    interface Locals {
      /** Auth tokens (OIDC + DC JWT), refreshed in hooks; null when signed out. */
      session: SessionTokens | null;
    }

    interface PageData {
      /** Whether the request has a valid session. The user payload itself
       * lives in localStorage on the client, not in page data. */
      authenticated?: boolean;
    }

    // interface PageState {}
  }
}

export {};
