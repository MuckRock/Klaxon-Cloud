import type { AddOn, Event, Page, Run } from "../lib/types";

import { describe, it, expect } from "vitest";
import { klaxon } from "./fixtures/addons";
import { event, eventsList, scheduled } from "./fixtures/events";
import { runs } from "./fixtures/runs";

describe("fixtures", () => {
  it("addon fixture matches AddOn shape", () => {
    const addon: AddOn = klaxon;
    expect(addon.id).toBe(436);
    expect(addon.repository).toBe("MuckRock/Klaxon");
    expect(addon.parameters.required).toEqual(["site", "selector"]);
  });

  it("event fixture has expanded addon", () => {
    const e: Event = event;
    expect(typeof e.addon).toBe("object");
    // narrow: when expanded, addon is an AddOn object, not a number
    if (typeof e.addon !== "number") {
      expect(e.addon.id).toBe(436);
    }
  });

  it("events list is a Page<Event>", () => {
    const page: Page<Event> = eventsList;
    expect(page.results).toHaveLength(2);
    expect(page.next).toBeNull();
    expect(page.results[0].id).toBe(7);
  });

  it("scheduled events page has no count", () => {
    const page: Page<Event> = scheduled;
    expect(page.count).toBeUndefined();
    expect(page.results).toHaveLength(2);
  });

  it("runs page contains Run records with expanded addons", () => {
    const page: Page<Run> = runs;
    expect(page.results.length).toBeGreaterThan(0);
    const run = page.results[0];
    expect(run.uuid).toBe("f9637f19-9ef9-4466-810c-96a0c4e761f7");
    expect(run.addon.id).toBe(436);
  });
});
