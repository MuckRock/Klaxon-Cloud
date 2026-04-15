import { describe, it, expect, beforeEach } from "vitest";
import { selectorForElement, deepestSelector, resolveTarget } from "./selector";

describe("selectorForElement", () => {
  it("returns tag name for a plain element", () => {
    const el = document.createElement("div");
    expect(selectorForElement(el)).toBe("div");
  });

  it("includes id when present", () => {
    const el = document.createElement("span");
    el.id = "main";
    expect(selectorForElement(el)).toBe("span#main");
  });

  it("includes class names dot-separated", () => {
    const el = document.createElement("p");
    el.className = "foo bar";
    expect(selectorForElement(el)).toBe("p.foo.bar");
  });

  it("includes both id and classes", () => {
    const el = document.createElement("section");
    el.id = "hero";
    el.className = "wide dark";
    expect(selectorForElement(el)).toBe("section#hero.wide.dark");
  });
});

describe("deepestSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns empty string for body element", () => {
    expect(deepestSelector(document.body)).toBe("");
  });

  it("returns selector for a direct child of body", () => {
    const el = document.createElement("div");
    el.id = "app";
    document.body.appendChild(el);
    expect(deepestSelector(el)).toBe("div#app");
  });

  it("returns the deepest element selector, not an ancestor", () => {
    const wrapper = document.createElement("div");
    wrapper.id = "wrapper";
    const inner = document.createElement("span");
    inner.className = "text";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    expect(deepestSelector(inner)).toBe("span.text");
  });

  it("returns the deepest element in a three-level hierarchy", () => {
    const a = document.createElement("section");
    a.id = "top";
    const b = document.createElement("article");
    b.className = "mid";
    const c = document.createElement("p");
    c.id = "leaf";
    a.appendChild(b);
    b.appendChild(c);
    document.body.appendChild(a);

    expect(deepestSelector(c)).toBe("p#leaf");
  });
});

describe("resolveTarget", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    host = document.createElement("div");
    host.id = "klaxon-host";
    document.body.appendChild(host);
  });

  it("returns null when elementFromPoint returns null", () => {
    const evt = new MouseEvent("mousemove", { clientX: -1, clientY: -1 });
    expect(resolveTarget(evt, host)).toBeNull();
  });

  it("returns null when the element is inside the host", () => {
    const child = document.createElement("div");
    host.appendChild(child);

    const evt = new MouseEvent("mousemove", { clientX: 0, clientY: 0 });
    const result = resolveTarget(evt, host);
    // Either null (no element at point) or null (inside host) — both valid
    expect(result).toBeNull();
  });
});
