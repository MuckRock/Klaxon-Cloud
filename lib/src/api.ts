/**
 * Fundamental, transport-free logic for the DocumentCloud add-on API that
 * powers Klaxon.
 *
 * This module owns endpoint URL construction, query-param assembly and request
 * payload building — but it never fetches and never reads env or auth state.
 * Each workspace composes these builders with its own transport (the extension
 * proxies through its service worker; the web app fetches server-side) and its
 * own env-derived config (`apiUrl`, `klaxonId`).
 */

import type {
  AddOnPayload,
  AddOnSchedule,
  APIResponse,
  Event,
  KlaxonParams,
  Page,
  Run,
  ValidationError,
} from "./types";

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

// The run `message` the Add-On records when it sees a change. Filtering runs by
// it drops the no-op "no change" runs.
export const CHANGED = "Change detected";

export interface RunQuery {
  site?: string;
  domain?: string;
  event?: number;
  cursor?: string;
  per_page?: number;
  /** Filter to only runs that recorded a change. Defaults to true. */
  changesOnly?: boolean;
}

export interface EventQuery {
  site?: string;
  domain?: string;
  event?: number;
  cursor?: string;
  per_page?: number;
}

function applyListParams(
  url: URL,
  { site, domain, event, cursor, per_page }: EventQuery,
): URL {
  if (site) url.searchParams.set("site", site); // setting it here keeps it encoded
  if (domain) url.searchParams.set("domain", domain);
  if (event) url.searchParams.set("event", event.toString());
  if (cursor) url.searchParams.set("cursor", cursor);
  if (per_page) url.searchParams.set("per_page", per_page.toString());
  return url;
}

/**
 * Build the URL for listing Klaxon runs. Filters to changed runs unless
 * `changesOnly` is explicitly false.
 */
export function runsUrl(apiUrl: string, klaxonId: string, query: RunQuery): URL {
  const { changesOnly = true, ...rest } = query;
  const url = new URL(`addon_runs/?expand=addon,event&addon=${klaxonId}`, apiUrl);
  if (changesOnly) url.searchParams.set("message", CHANGED);
  return applyListParams(url, rest);
}

/**
 * Build the URL for listing scheduled add-on events (alerts).
 */
export function eventsUrl(
  apiUrl: string,
  klaxonId: string,
  query: EventQuery,
): URL {
  const url = new URL(`addon_events/?expand=addon&addon=${klaxonId}`, apiUrl);
  return applyListParams(url, query);
}

/**
 * Build the URL for a single add-on event (alert).
 */
export function eventUrl(apiUrl: string, eventId: number): URL {
  return new URL(`addon_events/${eventId}/?expand=addon`, apiUrl);
}

/**
 * Build the URL for creating an add-on event (alert).
 */
export function eventsCreateUrl(apiUrl: string): URL {
  return new URL("addon_events/", apiUrl);
}

/**
 * Build the request payload for creating or updating an add-on event. Including
 * the `event` property schedules runs (or cancels, when it's zero).
 */
export function eventPayload(
  klaxonId: string,
  schedule: AddOnSchedule,
  parameters: Partial<KlaxonParams>,
): AddOnPayload {
  return {
    addon: Number(klaxonId),
    event: eventValues[schedule],
    parameters,
  };
}

/**
 * The Klaxon API client contract, shared by every workspace's transport layer.
 * Each environment composes the builders above with its own fetch and auth, but
 * exposes this same surface (the extension's `swFetch` client, the web app's
 * request-scoped `klaxonApi`). The bodies differ; the shape doesn't.
 */
export interface KlaxonApi {
  history(query: RunQuery): Promise<APIResponse<Page<Run>, unknown>>;
  scheduled(query: EventQuery): Promise<APIResponse<Page<Event>, unknown>>;
  dispatch(
    schedule: AddOnSchedule,
    parameters: KlaxonParams,
  ): Promise<APIResponse<Event, ValidationError>>;
  update(
    eventId: number,
    schedule: AddOnSchedule,
    parameters: Partial<KlaxonParams>,
  ): Promise<APIResponse<Event, ValidationError>>;
}
