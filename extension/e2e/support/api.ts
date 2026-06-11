import type { BrowserContext } from "@playwright/test";
import type { AddOnPayload, Event, Page, Run } from "../../src/lib/types";
import { scheduled } from "../../src/test/fixtures/events";
import { emptyRuns, runs as runsFixture } from "../../src/test/fixtures/runs";

// The DocumentCloud API the *service worker* talks to. Calls originate in the
// SW (api/fetch proxy), so these are mocked with context.route, not page.route.
// We match on the path with a RegExp — the baked-in API host is irrelevant and
// the SW appends query params, so a substring match is the robust choice.
const EVENTS_URL = /\/addon_events/;
const RUNS_URL = /\/addon_runs/;

// Mirror of `eventValues` in src/lib/api.ts. That module can't be imported into
// the Node test process — it pulls in the runes-based auth module ($state),
// which only the Svelte compiler can execute. Kept in sync by hand.
export const scheduleValues = {
  disabled: 0,
  hourly: 1,
  daily: 2,
  weekly: 3,
} as const;

// A real scheduled Event we clone for create/update responses, so the shapes
// the views consume (id, parameters, expanded addon) are always valid.
const TEMPLATE_EVENT = scheduled.results[0];

/** Build an Event from the template, overriding the fields a test cares about. */
export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    ...TEMPLATE_EVENT,
    ...overrides,
    parameters: { ...TEMPLATE_EVENT.parameters, ...overrides.parameters },
  };
}

/**
 * A runs Page whose runs all point at `event`. ViewAlert filters history to
 * runs whose `event.id` matches the alert it's showing, so re-pointing real
 * fixture runs is the simplest way to make "Recent changes" populate.
 */
export function runsForEvent(event: Event, count = 2): Page<Run> {
  return {
    next: null,
    previous: null,
    results: runsFixture.results
      .slice(0, count)
      .map((run) => ({ ...run, event })),
  };
}

export interface ApiMockOptions {
  /** Page returned for GET addon_events (the alerts list). Defaults to `scheduled`. */
  events?: Page<Event>;
  /** Page returned for GET addon_runs (change history). Defaults to no runs. */
  runs?: Page<Run>;
}

/** Mutations the SW sent, captured so flow tests can assert what was saved. */
export interface ApiRequests {
  created: AddOnPayload[];
  updated: { id: number; payload: AddOnPayload }[];
}

/**
 * Mock the Klaxon DocumentCloud endpoints for one test's context. Handles the
 * full CRUD surface the views exercise:
 *   - GET  addon_events      → the alerts list
 *   - POST addon_events      → create (dispatch); echoes the posted payload back
 *   - PATCH addon_events/:id → update; echoes the patched payload back
 *   - GET  addon_runs        → change history
 *
 * Returns a live record of the create/update requests so a flow test can assert
 * the right data reached the API. This is the template every view spec reuses.
 */
export function mockKlaxonApi(
  context: BrowserContext,
  options: ApiMockOptions = {},
): ApiRequests {
  const events = options.events ?? scheduled;
  const runs = options.runs ?? emptyRuns;
  const requests: ApiRequests = { created: [], updated: [] };

  context.route(EVENTS_URL, async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "POST") {
      const payload = request.postDataJSON() as AddOnPayload;
      requests.created.push(payload);
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          makeEvent({
            id: 9001,
            event: payload.event,
            parameters: payload.parameters,
          }),
        ),
      });
      return;
    }

    if (method === "PATCH") {
      const payload = request.postDataJSON() as AddOnPayload;
      const id = idFromUrl(request.url());
      requests.updated.push({ id, payload });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          makeEvent({
            id,
            event: payload.event,
            parameters: payload.parameters,
          }),
        ),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(events),
    });
  });

  context.route(RUNS_URL, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(runs),
    });
  });

  return requests;
}

/** Pull the event id out of a `.../addon_events/533/?expand=addon` URL. */
function idFromUrl(url: string): number {
  const match = url.match(/addon_events\/(\d+)/);
  return match ? Number(match[1]) : 0;
}
