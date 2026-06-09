/**
 * Klaxon is a DocumentCloud add-on, so methods here use the API
 *
 * Key operations:
 * Listing scheduled jobs for a specific URL
 * Listing recent alerts for a specific URL
 * Modifying scheduled jobs (delete, dis-/enable)
 * Modifying a specific job (edit)
 */

import type {
  AddOnPayload,
  AddOnSchedule,
  APIResponse,
  Event,
  FetchMessage,
  KlaxonParams,
  Page,
  Run,
  ValidationError,
} from "./types";

import { getAccessToken } from "./auth.svelte";
import { getApiResponse } from "./utils";

const API_URL = import.meta.env.MUCKROCK_DOCUMENTCLOUD_API;
const KLAXON_ID = import.meta.env.MUCKROCK_KLAXON_ID; // this will change between environments
const CHANGED = "Change detected";

/**
 * Route fetch through the service worker to avoid CORS restrictions.
 * Returns a Response-compatible object so getApiResponse works unchanged.
 */
async function swFetch(
  url: URL,
  options: RequestInit,
): Promise<Response | void> {
  const msg: FetchMessage = {
    type: "api/fetch",
    url: url.toString(),
    options: {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body,
      credentials: options.credentials ?? "omit", // sending cookies triggers CSRF, so "omit"
    },
  };
  const reply = (await chrome.runtime.sendMessage(msg)) as
    | {
        ok: boolean;
        data?: { status: number; statusText: string; body: unknown };
        error?: string;
      }
    | undefined;

  if (!reply?.ok) {
    console.warn("SW fetch failed:", reply?.error);
    return undefined;
  }

  const { status, statusText, body } = reply.data!;
  return {
    status,
    statusText,
    json: async () => body,
  } as Response;
}

// schedules and eventValues are the inverse of each other, so store them together
export const schedules: AddOnSchedule[] = [
  "disabled",
  "hourly",
  "daily",
  "weekly",
];

export const eventValues: Record<AddOnSchedule, number> = {
  disabled: 0,
  hourly: 1,
  daily: 2,
  weekly: 3,
};

// for history and scheduled
interface SearchParams {
  site?: string;
  origin?: string;
  cursor?: string;
  per_page?: number;
  event?: number;
}

/**
 * List Klaxon runs by site
 */
export async function history({
  cursor,
  per_page,
  event,
  site,
  origin,
}: SearchParams): Promise<APIResponse<Page<Run>, unknown>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  const endpoint = new URL(
    `addon_runs/?expand=addon,event&addon=${KLAXON_ID}`,
    API_URL,
  );
  endpoint.searchParams.set("message", CHANGED); // filter out noop runs
  if (site) {
    endpoint.searchParams.set("site", site);
  }
  if (origin) {
    endpoint.searchParams.set("origin", origin);
  }
  if (event) {
    endpoint.searchParams.set("event", event.toString());
  }
  if (cursor) {
    endpoint.searchParams.set("cursor", cursor);
  }
  if (per_page) {
    endpoint.searchParams.set("per_page", per_page.toString());
  }

  const resp = await swFetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return getApiResponse<Page<Run>>(resp);
}

/**
 * List scheduled add-on events
 */
export async function scheduled({
  site,
  origin,
  cursor,
  per_page,
  event,
}: SearchParams): Promise<APIResponse<Page<Event>, unknown>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  const endpoint = new URL(
    `addon_events/?expand=addon&addon=${KLAXON_ID}`,
    API_URL,
  );
  if (site) {
    endpoint.searchParams.set("site", site); // so it's encoded
  }
  if (origin) {
    endpoint.searchParams.set("origin", origin);
  }
  if (event) {
    endpoint.searchParams.set("event", event.toString());
  }
  if (cursor) {
    endpoint.searchParams.set("cursor", cursor);
  }
  if (per_page) {
    endpoint.searchParams.set("per_page", per_page.toString());
  }

  const resp = await swFetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return getApiResponse<Page<Event>>(resp);
}

// dispatching

/**
 * Schedule (or disable) Klaxon to watch a single URL
 */
export async function dispatch(
  schedule: AddOnSchedule,
  parameters: KlaxonParams,
): Promise<APIResponse<Event, ValidationError>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  const endpoint = new URL("addon_events/", API_URL);
  const payload: AddOnPayload = {
    addon: +KLAXON_ID,
    event: eventValues[schedule],
    parameters,
  };

  const resp = await swFetch(endpoint, {
    body: JSON.stringify(payload),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-type": "application/json",
    },
    method: "POST",
  });

  return getApiResponse<Event, ValidationError>(resp);
}

/**
 * Update or cancel an add-on event
 */
export async function update(
  event_id: number,
  schedule: AddOnSchedule,
  parameters: Partial<KlaxonParams>,
): Promise<APIResponse<Event, ValidationError>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  const endpoint = new URL(`addon_events/${event_id}/?expand=addon`, API_URL);
  const payload: AddOnPayload = {
    addon: +KLAXON_ID,
    event: eventValues[schedule],
    parameters,
  };

  const resp = await swFetch(endpoint, {
    body: JSON.stringify(payload),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-type": "application/json",
    },
    method: "PATCH",
  });

  return getApiResponse<Event, ValidationError>(resp);
}
