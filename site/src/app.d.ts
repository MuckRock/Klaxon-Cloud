// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { PlausibleEventOptions } from "@plausible-analytics/tracker";
import type { SessionTokens } from "$lib/server/session";

declare global {
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
