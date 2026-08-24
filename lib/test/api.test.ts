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

  // The API types `slack_webhook` as a URI and rejects "", so an unset webhook
  // has to be absent from `parameters`. Every write goes through this builder,
  // which makes it the one place that can guarantee it.
  describe("slack_webhook", () => {
    const base = { site: "https://example.com", selector: "#main" };

    it("keeps a valid webhook URL", () => {
      const webhook = "https://hooks.slack.com/services/T000/B000/XXXX";
      const { parameters } = eventPayload(KLAXON_ID, "daily", {
        ...base,
        slack_webhook: webhook,
      });

      expect(parameters.slack_webhook).toBe(webhook);
    });

    it.each([
      ["an empty string", ""],
      ["whitespace", "   "],
      ["a malformed URL", "not-a-url"],
      ["a non-http scheme", "javascript:alert(1)"],
    ])("omits the key entirely when it's %s", (_label, raw) => {
      const { parameters } = eventPayload(KLAXON_ID, "daily", {
        ...base,
        slack_webhook: raw,
      });

      expect("slack_webhook" in parameters).toBe(false);
      expect(parameters).toEqual(base);
    });

    it("sends no empty string over the wire", () => {
      const payload = eventPayload(KLAXON_ID, "weekly", {
        ...base,
        slack_webhook: "",
      });

      expect(JSON.stringify(payload)).not.toContain("slack_webhook");
    });

    it("trims a webhook that arrives padded", () => {
      const { parameters } = eventPayload(KLAXON_ID, "weekly", {
        ...base,
        slack_webhook: "  https://hooks.slack.com/services/T/B/C  ",
      });

      expect(parameters.slack_webhook).toBe(
        "https://hooks.slack.com/services/T/B/C",
      );
    });

    it("leaves the other parameters untouched", () => {
      const { parameters } = eventPayload(KLAXON_ID, "hourly", {
        ...base,
        filter_selector: ".ads",
        title: "Docket",
        slack_webhook: "",
      });

      expect(parameters).toEqual({
        ...base,
        filter_selector: ".ads",
        title: "Docket",
      });
    });

    it("drops a blank webhook carried over from a stored alert", () => {
      // A re-save spreads the alert's existing parameters, which for older
      // alerts can still hold the empty string this normalization prevents.
      const stored = { ...base, slack_webhook: "" };
      const { parameters } = eventPayload(KLAXON_ID, "weekly", {
        ...stored,
        selector: "#other",
      });

      expect("slack_webhook" in parameters).toBe(false);
    });
  });
});
