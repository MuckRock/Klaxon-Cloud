import { describe, it, expect } from "vitest";

import {
  CHANGED,
  eventPayload,
  eventsCreateUrl,
  eventsUrl,
  eventUrl,
  eventValues,
  runsUrl,
  schedules,
} from "../src/api";

const API_URL = "https://api.dev.documentcloud.org/api/";
const KLAXON_ID = "999";

describe("runsUrl", () => {
  it("targets addon_runs filtered by addon, expanding addon+event", () => {
    const url = runsUrl(API_URL, KLAXON_ID, {});
    expect(url.pathname).toBe(new URL(`${API_URL}addon_runs/`).pathname);
    expect(url.searchParams.get("addon")).toBe(KLAXON_ID);
    expect(url.searchParams.get("expand")).toBe("addon,event");
  });

  it("filters to changed runs by default", () => {
    const url = runsUrl(API_URL, KLAXON_ID, {});
    expect(url.searchParams.get("message")).toBe(CHANGED);
  });

  it("omits the change filter when changesOnly is false", () => {
    const url = runsUrl(API_URL, KLAXON_ID, { changesOnly: false });
    expect(url.searchParams.has("message")).toBe(false);
  });

  it("appends site, event, cursor and per_page when supplied", () => {
    const url = runsUrl(API_URL, KLAXON_ID, {
      site: "https://example.com/?x=1&y=2",
      event: 533,
      cursor: "abc123",
      per_page: 25,
    });
    expect(url.searchParams.get("site")).toBe("https://example.com/?x=1&y=2");
    expect(url.searchParams.has("y")).toBe(false); // site stays encoded as one param
    expect(url.searchParams.get("event")).toBe("533");
    expect(url.searchParams.get("cursor")).toBe("abc123");
    expect(url.searchParams.get("per_page")).toBe("25");
  });

  it("omits cursor and per_page when not supplied", () => {
    const url = runsUrl(API_URL, KLAXON_ID, { site: "https://example.com" });
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.has("per_page")).toBe(false);
  });
});

describe("eventsUrl", () => {
  it("targets addon_events filtered by addon, expanding addon", () => {
    const url = eventsUrl(API_URL, KLAXON_ID, { site: "https://example.com" });
    expect(url.pathname).toBe(new URL(`${API_URL}addon_events/`).pathname);
    expect(url.searchParams.get("expand")).toBe("addon");
    expect(url.searchParams.get("addon")).toBe(KLAXON_ID);
    expect(url.searchParams.get("site")).toBe("https://example.com");
  });

  it("preserves site URLs that contain their own query string", () => {
    const url = eventsUrl(API_URL, KLAXON_ID, {
      site: "https://example.com/?x=1&y=2",
    });
    expect(url.searchParams.get("site")).toBe("https://example.com/?x=1&y=2");
    expect(url.searchParams.has("y")).toBe(false);
  });
});

describe("eventUrl / eventsCreateUrl", () => {
  it("builds the event-specific endpoint, expanding addon", () => {
    const url = eventUrl(API_URL, 533);
    expect(url.pathname).toBe(new URL(`${API_URL}addon_events/533/`).pathname);
    expect(url.searchParams.get("expand")).toBe("addon");
  });

  it("builds the create endpoint with no query", () => {
    expect(eventsCreateUrl(API_URL).toString()).toBe(`${API_URL}addon_events/`);
  });
});

describe("eventPayload", () => {
  it("builds an AddOnPayload from the schedule and parameters", () => {
    const parameters = { site: "https://example.com", selector: "#main" };
    expect(eventPayload(KLAXON_ID, "daily", parameters)).toEqual({
      addon: Number(KLAXON_ID),
      event: eventValues.daily,
      parameters,
    });
  });

  it("maps each schedule to its numeric event value", () => {
    expect(schedules.map((s) => eventValues[s])).toEqual([0, 1, 2, 3]);
    expect(eventPayload(KLAXON_ID, "disabled", {}).event).toBe(0);
  });
});
