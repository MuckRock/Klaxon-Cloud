// The web app's transport layer for the DocumentCloud add-on API. Mirrors the
// extension's api.ts, but fetches server-side (no CORS proxy needed) with the
// session's DocumentCloud JWT. Request shaping comes from the shared
// @klaxon/lib/api builders.
import type { RequestEvent } from "@sveltejs/kit";
import type {
  AddOnSchedule,
  APIResponse,
  Event,
  KlaxonParams,
  Page,
  Run,
  ValidationError,
} from "@klaxon/lib/types";
import { requireConfig } from "./env";
import {
  eventPayload,
  eventsCreateUrl,
  eventsUrl,
  eventUrl,
  runsUrl,
  type KlaxonApi,
} from "@klaxon/lib/api";
import { getApiResponse, USER_AGENT } from "@klaxon/lib/utils";

const UNAUTHENTICATED = {
  error: { status: 401, message: "Not authenticated" },
} as const;

/**
 * The shared contract plus the one read only the web app needs: a single alert
 * by id, for the per-alert changes page. (The extension always has the alert in
 * hand from a list it just fetched, so `KlaxonApi` doesn't carry this.)
 */
export interface SiteKlaxonApi extends KlaxonApi {
  alert(eventId: number): Promise<APIResponse<Event>>;
}

/**
 * Build a Klaxon API client for the current request. Reads the DocumentCloud
 * JWT from `locals.session` (already refreshed in hooks) and uses the event's
 * `fetch` so SvelteKit can track the dependency.
 */
export function klaxonApi(event: RequestEvent): SiteKlaxonApi {
  const { apiUrl, klaxonId } = requireConfig();
  const token = event.locals.session?.jwt.access_token ?? null;

  // Don't send cookies — the bearer token is the only credential, and a
  // session cookie would trip DRF's CSRF origin check (see oidc helpers).
  async function send(
    url: URL,
    init: RequestInit = {},
  ): Promise<Response | void> {
    if (!token) return undefined;
    try {
      return await event.fetch(url, {
        ...init,
        credentials: "omit",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          ...init.headers,
        },
      });
    } catch (err) {
      console.warn("[klaxon] API fetch failed:", err);
      return undefined; // getApiResponse maps this to a 500
    }
  }

  async function writeEvent(
    url: URL,
    method: "POST" | "PATCH",
    schedule: AddOnSchedule,
    parameters: Partial<KlaxonParams>,
  ): Promise<APIResponse<Event, ValidationError>> {
    if (!token) return UNAUTHENTICATED;
    const resp = await send(url, {
      method,
      body: JSON.stringify(eventPayload(klaxonId, schedule, parameters)),
      headers: { "Content-type": "application/json" },
    });
    return getApiResponse<Event, ValidationError>(resp);
  }

  return {
    async history(query) {
      if (!token) return UNAUTHENTICATED;
      return getApiResponse<Page<Run>>(
        await send(runsUrl(apiUrl, klaxonId, query)),
      );
    },
    async scheduled(query) {
      if (!token) return UNAUTHENTICATED;
      return getApiResponse<Page<Event>>(
        await send(eventsUrl(apiUrl, klaxonId, query)),
      );
    },
    async alert(eventId) {
      if (!token) return UNAUTHENTICATED;
      return getApiResponse<Event>(await send(eventUrl(apiUrl, eventId)));
    },
    dispatch(schedule, parameters) {
      return writeEvent(eventsCreateUrl(apiUrl), "POST", schedule, parameters);
    },
    update(eventId, schedule, parameters) {
      return writeEvent(
        eventUrl(apiUrl, eventId),
        "PATCH",
        schedule,
        parameters,
      );
    },
  };
}
