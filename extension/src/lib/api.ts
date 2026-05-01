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
  KlaxonParams,
  Page,
  Run,
  ValidationError,
} from "./types";

import { getAccessToken } from "./auth.svelte";
import { getApiResponse } from "./utils";

const API_URL = import.meta.env.MUCKROCK_DOCUMENTCLOUD_API;
const KLAXON_ID = import.meta.env.MUCKROCK_KLAXON_ID; // this will change between environments

// schedules and eventValues are the inverse of each other, so store them together
export const schedules: AddOnSchedule[] = [
  "disabled",
  "hourly",
  "daily",
  "weekly",
  "upload",
];

export const eventValues: Record<AddOnSchedule, number> = {
  disabled: 0,
  hourly: 1,
  daily: 2,
  weekly: 3,
  upload: 4,
};

/**
 * List Klaxon runs by site
 */
export async function history(
  site: string,
  params: { cursor?: string; per_page?: number } = {},
): Promise<APIResponse<Page<Run>, unknown>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  const endpoint = new URL(`addon_runs/?addon=${KLAXON_ID}`, API_URL);
  endpoint.searchParams.set("site", site);
  if (params.cursor) {
    endpoint.searchParams.set("cursor", params.cursor);
  }
  if (params.per_page) {
    endpoint.searchParams.set("per_page", params.per_page.toString());
  }

  const resp = await fetch(endpoint, {
    credentials: "omit",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).catch(console.warn);

  return getApiResponse<Page<Run>>(resp);
}

/**
 * List scheduled add-on events
 */
export async function scheduled(
  site: string,
  params: { cursor?: string; per_page?: number } = {},
): Promise<APIResponse<Page<Event>, unknown>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  const endpoint = new URL(
    `addon_events/?expand=addon&addon=${KLAXON_ID}`,
    API_URL,
  );
  endpoint.searchParams.set("site", site); // so it's encoded
  if (params.cursor) {
    endpoint.searchParams.set("cursor", params.cursor);
  }
  if (params.per_page) {
    endpoint.searchParams.set("per_page", params.per_page.toString());
  }

  const resp = await fetch(endpoint, {
    credentials: "omit",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).catch(console.warn);

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

  const resp = await fetch(endpoint, {
    body: JSON.stringify(payload),
    credentials: "omit",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-type": "application/json",
    },
    method: "POST",
  }).catch(console.warn);

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
  const endpoint = new URL(`addon_events/${event_id}/`, API_URL);
  const payload: AddOnPayload = {
    addon: +KLAXON_ID,
    event: eventValues[schedule],
    parameters,
  };

  const resp = await fetch(endpoint, {
    body: JSON.stringify(payload),
    credentials: "omit",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-type": "application/json",
    },
    method: "PUT",
  }).catch(console.warn);

  return getApiResponse<Event, ValidationError>(resp);
}
