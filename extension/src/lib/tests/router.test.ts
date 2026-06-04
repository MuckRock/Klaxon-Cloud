import { describe, it, expect, beforeEach, vi } from "vitest";
import { Router } from "../router.svelte";

// Construct a fresh Router per test so the private `#history` doesn't leak
// between cases. The exported singleton (`router`) is the same class; we test
// the class directly to keep each case isolated.
let router: Router;

beforeEach(() => {
  router = new Router();
});

describe("Router navigation", () => {
  it("starts on listChanges with empty props", () => {
    expect(router.current).toBe("listChanges");
    expect(router.props).toEqual({});
  });

  it("navigate() sets the current view and props", () => {
    router.navigate("editAlert", { id: 7 });

    expect(router.current).toBe("editAlert");
    expect(router.props).toEqual({ id: 7 });
  });

  it("navigate() with no props resets props to empty", () => {
    router.navigate("editAlert", { id: 7 });
    router.navigate("listChanges");

    expect(router.props).toEqual({});
  });
});

describe("Router.back", () => {
  it("returns to the view you came from, not the one you're on", () => {
    // The original bug: back() popped the destination and re-selected the
    // current view, so it never actually moved.
    router.navigate("createAlert");
    router.navigate("saveAlert");

    router.back();
    expect(router.current).toBe("createAlert");

    router.back();
    expect(router.current).toBe("listChanges");
  });

  it("restores the props of the view you return to", () => {
    router.navigate("editAlert", { id: 7 });
    router.navigate("saveAlert");

    router.back();

    expect(router.current).toBe("editAlert");
    expect(router.props).toEqual({ id: 7 });
  });

  it("restores the props of the origin you were on when you navigated away", () => {
    // Captures the *leaving* state: navigate must push where you are, with its
    // props, before switching to the destination.
    router.navigate("listAlerts", { page: 2 });
    router.navigate("createAlert");

    router.back();

    expect(router.current).toBe("listAlerts");
    expect(router.props).toEqual({ page: 2 });
  });

  it("snapshots props into history so later mutation can't corrupt them", () => {
    const props = { id: 1 };
    router.navigate("editAlert", props);
    router.navigate("saveAlert");

    // Mutating the object we passed earlier must not change the saved entry.
    props.id = 999;

    router.back();
    expect(router.props).toEqual({ id: 1 });
  });

  it("walks a multi-step stack back to the start", () => {
    router.navigate("listAlerts");
    router.navigate("createAlert");
    router.navigate("saveAlert");

    router.back();
    expect(router.current).toBe("createAlert");
    router.back();
    expect(router.current).toBe("listAlerts");
    router.back();
    expect(router.current).toBe("listChanges");
  });
});

describe("Router.back with empty history", () => {
  it("is a no-op when there's no history and no fallback", () => {
    router.back();

    expect(router.current).toBe("listChanges");
    expect(router.props).toEqual({});
  });

  it("navigates to the fallback when there's no history", () => {
    router.back("listAlerts");

    expect(router.current).toBe("listAlerts");
  });

  it("ignores the fallback when there IS history (real back wins)", () => {
    router.navigate("createAlert");

    router.back("listAlerts");

    expect(router.current).toBe("listChanges");
  });
});

describe("Router.canGoBack", () => {
  it("is false with no history", () => {
    expect(router.canGoBack).toBe(false);
  });

  it("is true after navigating", () => {
    router.navigate("createAlert");
    expect(router.canGoBack).toBe(true);
  });

  it("is false again once the stack is exhausted", () => {
    router.navigate("createAlert");
    router.back();
    expect(router.canGoBack).toBe(false);
  });
});

describe("Router.onchange", () => {
  it("fires on navigate with the destination view", () => {
    const onchange = vi.fn();
    router.onchange = onchange;

    router.navigate("createAlert");

    expect(onchange).toHaveBeenCalledWith("createAlert");
  });

  it("fires on back with the restored view", () => {
    router.navigate("createAlert");
    router.navigate("saveAlert");

    const onchange = vi.fn();
    router.onchange = onchange;

    router.back();

    expect(onchange).toHaveBeenCalledWith("createAlert");
  });
});
