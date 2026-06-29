/**
 * Klaxon is a DocumentCloud add-on, so methods here use the API.
 *
 * The fundamental request shaping (endpoint URLs, payloads, the schedule maps)
 * lives in the shared `@klaxon/lib/api` builders. This module is the
 * extension's transport layer: it routes every request through the service
 * worker (to bypass CORS), attaches the DocumentCloud bearer token, and parses
 * the response.
 *
 * Key operations:
 * Listing scheduled jobs for a specific URL
 * Listing recent alerts for a specific URL
 * Modifying scheduled jobs (delete, dis-/enable)
 * Modifying a specific job (edit)
 */

import type {
  APIResponse,
  Event,
  FetchMessage,
  KlaxonParams,
  Page,
  Run,
  ValidationError,
} from "@klaxon/lib/types";
import type { AddOnSchedule } from "@klaxon/lib/types";

import {
  eventPayload,
  eventsCreateUrl,
  eventsUrl,
  eventUrl,
  runsUrl,
  type EventQuery,
  type RunQuery,
} from "@klaxon/lib/api";
import { getApiResponse } from "@klaxon/lib/utils";

import { getAccessToken } from "./auth.svelte";

// Re-export the schedule maps so existing view imports (`from "../api"`)
// keep working.
export { eventValues, schedules } from "@klaxon/lib/api";

const API_URL = import.meta.env.MUCKROCK_DOCUMENTCLOUD_API;
const KLAXON_ID = import.meta.env.MUCKROCK_KLAXON_ID; // this will change between environments

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

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * List Klaxon runs by site
 */
export async function history(
  query: RunQuery,
): Promise<APIResponse<Page<Run>, unknown>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }

  const resp = await swFetch(runsUrl(API_URL, KLAXON_ID, query), {
    headers: authHeaders(token),
  });

  return getApiResponse<Page<Run>>(resp);
}

/**
 * List scheduled add-on events
 */
export async function scheduled(
  query: EventQuery,
): Promise<APIResponse<Page<Event>, unknown>> {
  const token = await getAccessToken().catch(console.warn);
  if (!token) {
    return { error: { status: 401, message: "Not authenticated" } };
  }

  const resp = await swFetch(eventsUrl(API_URL, KLAXON_ID, query), {
    headers: authHeaders(token),
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

  const resp = await swFetch(eventsCreateUrl(API_URL), {
    body: JSON.stringify(eventPayload(KLAXON_ID, schedule, parameters)),
    headers: { ...authHeaders(token), "Content-type": "application/json" },
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

  const resp = await swFetch(eventUrl(API_URL, event_id), {
    body: JSON.stringify(eventPayload(KLAXON_ID, schedule, parameters)),
    headers: { ...authHeaders(token), "Content-type": "application/json" },
    method: "PATCH",
  });

  return getApiResponse<Event, ValidationError>(resp);
}
