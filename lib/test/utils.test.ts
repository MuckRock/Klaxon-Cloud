import { describe, it, expect } from "vitest";
import { getDomain, isWholePage, parseTimestamp } from "../src/utils";
import type { Event } from "../src/types";

/** A minimal Event, just enough for the site-derived helpers. */
function eventFor(site: string): Event {
  return { parameters: { site, selector: "*" } } as Event;
}

describe("getDomain", () => {
  it("returns the hostname of the watched URL", () => {
    expect(getDomain(eventFor("https://example.com/docket/1?tab=2"))).toBe(
      "example.com",
    );
  });

  it("drops a leading www. so subdomain variants group together", () => {
    expect(getDomain(eventFor("https://www.example.com/"))).toBe("example.com");
  });

  it("keeps other subdomains", () => {
    expect(getDomain(eventFor("https://courts.example.com/"))).toBe(
      "courts.example.com",
    );
  });

  it("falls back to the raw site when it isn't a URL", () => {
    expect(getDomain(eventFor("not a url"))).toBe("not a url");
  });

  it("returns null without an expanded event or site", () => {
    expect(getDomain(undefined)).toBeNull();
    expect(getDomain(null)).toBeNull();
    expect(getDomain(6)).toBeNull(); // unexpanded event id
    expect(getDomain(eventFor(""))).toBeNull();
  });
});

describe("isWholePage", () => {
  it("treats the '*' selector as whole-page", () => {
    expect(isWholePage("*")).toBe(true);
    expect(isWholePage(" * ")).toBe(true);
  });

  it("treats an empty/whitespace/missing selector as whole-page (legacy)", () => {
    expect(isWholePage("")).toBe(true);
    expect(isWholePage("   ")).toBe(true);
    expect(isWholePage(null)).toBe(true);
    expect(isWholePage(undefined)).toBe(true);
  });

  it("treats a real selector as a partial selection", () => {
    expect(isWholePage("#main")).toBe(false);
    expect(isWholePage("div.content > p")).toBe(false);
    expect(isWholePage("readme-toc")).toBe(false);
  });
});

describe("parseTimestamp", () => {
  it("parses a valid YYYYMMDDHHMMSS timestamp as UTC", () => {
    const date = parseTimestamp("20260609192941");

    expect(date).not.toBeNull();
    expect(date?.toISOString()).toBe("2026-06-09T19:29:41.000Z");
  });

  it("interprets each field as UTC, not local time", () => {
    const date = parseTimestamp("20260101000000");

    expect(date?.getUTCFullYear()).toBe(2026);
    expect(date?.getUTCMonth()).toBe(0);
    expect(date?.getUTCDate()).toBe(1);
    expect(date?.getUTCHours()).toBe(0);
  });

  it("returns null when the string is not 14 digits", () => {
    expect(parseTimestamp("2026060919294")).toBeNull(); // too short
    expect(parseTimestamp("202606091929410")).toBeNull(); // too long
    expect(parseTimestamp("")).toBeNull();
  });

  it("returns null for non-digit characters", () => {
    expect(parseTimestamp("2026-06-09T19:29")).toBeNull();
    expect(parseTimestamp("2026060919294a")).toBeNull();
  });

  it("returns null when fields roll over to an invalid date", () => {
    expect(parseTimestamp("20261301000000")).toBeNull(); // month 13
    expect(parseTimestamp("20260631000000")).toBeNull(); // June 31
  });

  // Real timestamps pulled from src/test/fixtures/runs.ts (run data.timestamp
  // and event scratch.timestamp values), so we know we handle production shapes.
  it.each([
    ["20260520191726", "2026-05-20T19:17:26.000Z"],
    ["20260519234803", "2026-05-19T23:48:03.000Z"],
    ["20260519191625", "2026-05-19T19:16:25.000Z"],
    ["20260519190547", "2026-05-19T19:05:47.000Z"],
    ["20260503141144", "2026-05-03T14:11:44.000Z"],
    ["20260422115029", "2026-04-22T11:50:29.000Z"],
    ["20260310202715", "2026-03-10T20:27:15.000Z"],
    ["20260302180027", "2026-03-02T18:00:27.000Z"],
    ["20260210024743", "2026-02-10T02:47:43.000Z"],
    ["20260129070147", "2026-01-29T07:01:47.000Z"],
  ])("parses real fixture timestamp %s", (timestamp, expected) => {
    expect(parseTimestamp(timestamp)?.toISOString()).toBe(expected);
  });
});
