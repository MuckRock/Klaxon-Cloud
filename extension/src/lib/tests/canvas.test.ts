import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Characterization tests for the canvas picker's state machine and public API.
//
// These lock down the behavior that must survive the planned refactor of
// canvas.svelte.ts (imperative overlay DOM → a `Canvas.svelte` view). They
// assert on the `Canvas` contract — `state.*`, `active`/`editable`,
// `setSelector`/`clearSelection`/`destroy`, and how window events drive that
// state — NOT on the overlay divs' pixel positions, which the refactor
// replaces (those are covered by manual smoke in the plan).
//
// selector.ts's geometry entry points are mocked: this isolates the canvas's
// own logic from real `getBoundingClientRect`/`elementFromPoint` (which return
// zeros / nothing under happy-dom anyway). selector.ts has its own tests.

vi.mock("../selector", () => ({
  resolveTarget: vi.fn(),
  resolveEnclosingElement: vi.fn(),
  buildResolvedTarget: vi.fn(),
}));

import { initCanvas, type Canvas } from "../canvas.svelte.ts";
import * as selector from "../selector";

const resolveTarget = vi.mocked(selector.resolveTarget);
const resolveEnclosingElement = vi.mocked(selector.resolveEnclosingElement);

/** Build a fake ResolvedTarget. `structured` is irrelevant to these tests. */
function target(selectorStr: string, matchText = "text") {
  return {
    el: document.querySelector(selectorStr)!,
    structured: undefined as unknown as never,
    selector: selectorStr,
    matchText,
  };
}

/** Dispatch a MouseEvent on `el` (defaults to the page target) and return a
 *  preventDefault spy. Bubbles so it reaches the window listeners. */
function fire(
  type: string,
  opts: { x?: number; y?: number; on?: Element } = {},
) {
  const { x = 0, y = 0, on } = opts;
  const evt = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
  const preventDefault = vi.spyOn(evt, "preventDefault");
  (on ?? pageEl).dispatchEvent(evt);
  return preventDefault;
}

let host: HTMLElement;
let shadow: ShadowRoot;
let canvas: Canvas;
let pageEl: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  document.body.style.userSelect = "";

  // The page content the picker operates on.
  const main = document.createElement("main");
  main.innerHTML = '<p id="para">hello world</p>';
  document.body.appendChild(main);
  pageEl = main.querySelector("#para")!;

  // The Klaxon host + shadow root, kept separate from the page content.
  host = document.createElement("div");
  host.id = "klaxon-host";
  document.body.appendChild(host);
  shadow = host.attachShadow({ mode: "open" });

  resolveTarget.mockReset();
  resolveEnclosingElement.mockReset();

  canvas = initCanvas(host, shadow, 300);
});

afterEach(() => {
  canvas.destroy();
});

describe("initial state", () => {
  it("starts inactive, editable, with an empty selection", () => {
    expect(canvas.active).toBe(false);
    expect(canvas.editable).toBe(true);
    expect(canvas.state.selector).toBe("");
    expect(canvas.state.matchText).toBe("");
    expect(canvas.state.locked).toBe(false);
    expect(canvas.state.dragging).toBe(false);
    expect(canvas.state.structured).toBeUndefined();
  });
});

describe("active", () => {
  it("disables page text selection while active and restores it when off", () => {
    canvas = reinitWith("auto"); // re-init so prevUserSelect captures "auto"

    canvas.active = true;
    expect(document.body.style.userSelect).toBe("none");

    canvas.active = false;
    expect(document.body.style.userSelect).toBe("auto");
  });

  it("does not respond to mouse events until active", () => {
    // Inactive: interaction listeners aren't attached.
    fire("mousemove", { x: 10, y: 20 });
    expect(canvas.state.mouse).toEqual({ x: 0, y: 0 });

    canvas.active = true;
    fire("mousemove", { x: 10, y: 20 });
    expect(canvas.state.mouse).toEqual({ x: 10, y: 20 });
  });
});

describe("hover (mousemove)", () => {
  beforeEach(() => {
    canvas.active = true;
  });

  it("tracks the mouse position", () => {
    fire("mousemove", { x: 42, y: 99 });
    expect(canvas.state.mouse).toEqual({ x: 42, y: 99 });
  });

  it("updates selector/matchText from the resolved target", () => {
    resolveTarget.mockReturnValue(target("p#para", "hello world"));
    fire("mousemove", { x: 5, y: 5 });
    expect(canvas.state.selector).toBe("p#para");
    expect(canvas.state.matchText).toBe("hello world");
  });

  it("does not pick a hover target when not editable", () => {
    canvas.editable = false;
    resolveTarget.mockReturnValue(target("p#para"));
    fire("mousemove", { x: 5, y: 5 });
    expect(canvas.state.selector).toBe("");
    // ...but the mouse position still tracks.
    expect(canvas.state.mouse).toEqual({ x: 5, y: 5 });
  });
});

describe("click to select", () => {
  beforeEach(() => {
    canvas.active = true;
  });

  it("locks a selection when pressing and releasing in place", () => {
    resolveTarget.mockReturnValue(target("p#para", "hello world"));

    fire("mousedown", { x: 10, y: 10 });
    fire("mouseup", { x: 10, y: 10 }); // no movement → a click, not a drag

    expect(canvas.state.locked).toBe(true);
    expect(canvas.state.selector).toBe("p#para");
    expect(canvas.state.matchText).toBe("hello world");
  });

  it("keeps the current selection when clicking elsewhere while locked", () => {
    // First click locks p#para.
    resolveTarget.mockReturnValue(target("p#para"));
    fire("mousedown", { x: 10, y: 10 });
    fire("mouseup", { x: 10, y: 10 });
    expect(canvas.state.locked).toBe(true);

    // Clicking another element while a selection is locked leaves it intact;
    // the selection is only dismissed via the dismiss button (clearSelection).
    resolveTarget.mockReturnValue(target("main", "other"));
    fire("mousedown", { x: 50, y: 50 });
    fire("mouseup", { x: 50, y: 50 });

    expect(canvas.state.locked).toBe(true);
    expect(canvas.state.selector).toBe("p#para");
  });

  it("ignores events originating inside the host", () => {
    const inside = document.createElement("button");
    shadow.appendChild(inside);
    resolveTarget.mockReturnValue(target("p#para"));

    fire("mousedown", { x: 10, y: 10, on: inside });
    fire("mouseup", { x: 10, y: 10, on: inside });

    expect(canvas.state.locked).toBe(false);
    expect(canvas.state.selector).toBe("");
  });
});

describe("drag to select", () => {
  beforeEach(() => {
    canvas.active = true;
  });

  it("enters dragging when the mouse moves with the button down, then commits on mouseup", () => {
    fire("mousedown", { x: 0, y: 0 });

    // A clear drag motion with the button held down.
    fire("mousemove", { x: 40, y: 40 });
    expect(canvas.state.dragging).toBe(true);

    resolveEnclosingElement.mockReturnValue(target("main", "enclosed"));
    fire("mouseup", { x: 40, y: 40 });

    expect(canvas.state.dragging).toBe(false);
    expect(canvas.state.locked).toBe(true);
    expect(canvas.state.selector).toBe("main");
    expect(canvas.state.matchText).toBe("enclosed");
  });
});

describe("setSelector", () => {
  it("locks onto an element matching the CSS and returns it", () => {
    const el = canvas.setSelector("p#para");
    expect(el).toBe(pageEl);
    expect(canvas.state.selector).toBe("p#para");
    expect(canvas.state.matchText).toBe("hello world");
    expect(canvas.state.locked).toBe(true);
    expect(canvas.state.structured).toBeUndefined();
  });

  it("returns null and leaves state untouched when nothing matches", () => {
    const el = canvas.setSelector("#does-not-exist");
    expect(el).toBeNull();
    expect(canvas.state.selector).toBe("");
    expect(canvas.state.locked).toBe(false);
  });

  it("returns null for an element inside the host", () => {
    const inside = document.createElement("span");
    inside.id = "in-host";
    shadow.appendChild(inside);
    expect(canvas.setSelector("#in-host")).toBeNull();
    expect(canvas.state.locked).toBe(false);
  });
});

describe("clearSelection", () => {
  it("resets the selection back to empty", () => {
    canvas.setSelector("p#para");
    expect(canvas.state.locked).toBe(true);

    canvas.clearSelection();

    expect(canvas.state.selector).toBe("");
    expect(canvas.state.matchText).toBe("");
    expect(canvas.state.locked).toBe(false);
    expect(canvas.state.structured).toBeUndefined();
  });
});

describe("destroy", () => {
  it("detaches listeners and restores text selection", () => {
    canvas = reinitWith("auto");
    canvas.active = true;
    expect(document.body.style.userSelect).toBe("none");

    canvas.destroy();
    expect(document.body.style.userSelect).toBe("auto");

    // No further reaction to events after teardown.
    resolveTarget.mockReturnValue(target("p#para"));
    fire("mousemove", { x: 5, y: 5 });
    expect(canvas.state.mouse).toEqual({ x: 0, y: 0 });
  });
});

/** Tear down the beforeEach canvas, set `body.style.userSelect`, then build a
 *  fresh canvas so it captures that value as `prevUserSelect`. The destroy must
 *  happen before the assignment — it restores userSelect to its own captured
 *  value and would otherwise clobber the one we're setting up. */
function reinitWith(userSelect: string): Canvas {
  canvas.destroy();
  document.body.style.userSelect = userSelect;
  return initCanvas(host, shadow, 300);
}
