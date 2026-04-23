import { describe, it, expect, beforeEach } from "vitest";
import {
  cssSelector,
  serialize,
  resolveTarget,
  type StructuredSelector,
  type SpecificityLevel,
} from "../selector";

/** Helper: serialize a structured selector at full specificity. */
function toCSS(sel: StructuredSelector): string {
  return serialize(sel);
}

/** Helper: assert the selector is unique and resolves to the element. */
function assertUnique(sel: StructuredSelector, el: Element) {
  const css = toCSS(sel);
  const matches = document.querySelectorAll(css);
  expect(matches.length).toBe(1);
  expect(matches[0]).toBe(el);
}

describe("cssSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns 'body' segment for body element", () => {
    const sel = cssSelector(document.body);
    expect(sel.segments).toHaveLength(1);
    expect(sel.segments[0].tag).toBe("body");
    expect(toCSS(sel)).toBe("body");
  });

  it("uses unique ID when available", () => {
    document.body.innerHTML = '<div id="app"><p id="unique">hello</p></div>';
    const el = document.getElementById("unique")!;
    const sel = cssSelector(el);
    expect(toCSS(sel)).toBe("p#unique");
    assertUnique(sel, el);
  });

  it("uses unique data attribute", () => {
    document.body.innerHTML =
      '<div><span data-testid="foo">a</span><span>b</span></div>';
    const el = document.querySelector('[data-testid="foo"]')!;
    const sel = cssSelector(el);
    expect(toCSS(sel)).toContain("data-testid");
    assertUnique(sel, el);
  });

  it("uses unique class", () => {
    document.body.innerHTML =
      '<div><p class="intro">a</p><p class="body">b</p></div>';
    const el = document.querySelector(".intro")!;
    const sel = cssSelector(el);
    assertUnique(sel, el);
  });

  it("uses tag when unique", () => {
    document.body.innerHTML = "<main><article>content</article></main>";
    const el = document.querySelector("article")!;
    const sel = cssSelector(el);
    expect(toCSS(sel)).toBe("article");
    assertUnique(sel, el);
  });

  it("adds nth-of-type for ambiguous siblings", () => {
    document.body.innerHTML = "<div><p>first</p><p>second</p></div>";
    const els = document.querySelectorAll("p");

    const sel0 = cssSelector(els[0]);
    const sel1 = cssSelector(els[1]);

    assertUnique(sel0, els[0]);
    assertUnique(sel1, els[1]);

    // They should produce different selectors
    expect(toCSS(sel0)).not.toBe(toCSS(sel1));
  });

  it("builds multi-segment selector for deep nesting", () => {
    document.body.innerHTML = `
      <div><ul><li>a</li><li>b</li></ul></div>
      <div><ul><li>c</li><li>d</li></ul></div>
    `;
    // Target "c" — the first <li> in the second <ul>
    const lis = document.querySelectorAll("li");
    const el = lis[2]; // "c"
    const sel = cssSelector(el);
    assertUnique(sel, el);
  });

  it("excludes klaxon classes from selectors", () => {
    document.body.innerHTML =
      '<div class="klaxon-hover klaxon-selection real-class">text</div>';
    const el = document.querySelector("div")!;
    const sel = cssSelector(el);
    const css = toCSS(sel);
    expect(css).not.toContain("klaxon-hover");
    expect(css).not.toContain("klaxon-selection");
  });

  it("anchors to unique-ID ancestor", () => {
    document.body.innerHTML = `
      <div id="sidebar"><p>a</p><p>b</p></div>
      <div id="main"><p>c</p><p>d</p></div>
    `;
    const el = document.querySelectorAll("#main p")[1]; // "d"
    const sel = cssSelector(el);
    assertUnique(sel, el);
    expect(toCSS(sel)).toContain("#main");
  });
});

describe("cssSelector – tables", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("uniquely identifies individual table cells", () => {
    document.body.innerHTML = `
      <table>
        <tr><td>r1c1</td><td>r1c2</td></tr>
        <tr><td>r2c1</td><td>r2c2</td></tr>
      </table>
    `;
    const cells = document.querySelectorAll("td");
    const selectors = Array.from(cells).map((cell) => cssSelector(cell));

    // Each cell should have a unique selector
    for (let i = 0; i < cells.length; i++) {
      assertUnique(selectors[i], cells[i]);
    }

    // All selectors should be distinct
    const cssStrings = selectors.map(toCSS);
    expect(new Set(cssStrings).size).toBe(cells.length);
  });

  it("distinguishes cells across rows", () => {
    document.body.innerHTML = `
      <table>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </table>
    `;
    const cells = document.querySelectorAll("td");
    const sel0 = cssSelector(cells[0]);
    const sel1 = cssSelector(cells[1]);

    assertUnique(sel0, cells[0]);
    assertUnique(sel1, cells[1]);
    expect(toCSS(sel0)).not.toBe(toCSS(sel1));
  });
});

describe("cssSelector – lists", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("uniquely identifies individual list items", () => {
    document.body.innerHTML = "<ul><li>one</li><li>two</li><li>three</li></ul>";
    const items = document.querySelectorAll("li");

    for (const item of items) {
      const sel = cssSelector(item);
      assertUnique(sel, item);
    }
  });

  it("handles nested lists", () => {
    document.body.innerHTML = `
      <ul>
        <li>parent
          <ul><li>child-a</li><li>child-b</li></ul>
        </li>
        <li>sibling</li>
      </ul>
    `;
    const innerItems = document.querySelectorAll("ul ul li");

    for (const item of innerItems) {
      const sel = cssSelector(item);
      assertUnique(sel, item);
    }
  });
});

describe("cssSelector – headings", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("distinguishes headings by document position", () => {
    document.body.innerHTML = `
      <section><h2>First</h2><p>content</p></section>
      <section><h2>Second</h2><p>content</p></section>
    `;
    const headings = document.querySelectorAll("h2");
    const sel0 = cssSelector(headings[0]);
    const sel1 = cssSelector(headings[1]);

    assertUnique(sel0, headings[0]);
    assertUnique(sel1, headings[1]);
    expect(toCSS(sel0)).not.toBe(toCSS(sel1));
  });
});

describe("serialize", () => {
  const seg = (
    tag: string,
    opts: Partial<StructuredSelector["segments"][0]> = {},
  ): StructuredSelector["segments"][0] => ({
    tag,
    attributes: { classes: [], dataAttrs: [], semantic: [] },
    ...opts,
  });

  it("produces full CSS with all levels", () => {
    const sel: StructuredSelector = {
      segments: [
        seg("div", {
          attributes: {
            id: "#wrapper",
            classes: [],
            dataAttrs: [],
            semantic: [],
          },
        }),
        seg("p", {
          attributes: { classes: ["intro"], dataAttrs: [], semantic: [] },
          structural: { nthOfType: 2 },
        }),
      ],
    };
    expect(serialize(sel)).toBe("div#wrapper > p.intro:nth-of-type(2)");
  });

  it("omits structural when excluded", () => {
    const sel: StructuredSelector = {
      segments: [
        seg("p", {
          attributes: { classes: ["intro"], dataAttrs: [], semantic: [] },
          structural: { nthOfType: 2 },
        }),
      ],
    };
    const levels: Set<SpecificityLevel> = new Set(["containers", "attributes"]);
    expect(serialize(sel, levels)).toBe("p.intro");
  });

  it("uses only target segment when containers excluded", () => {
    const sel: StructuredSelector = {
      segments: [
        seg("div", {
          attributes: {
            id: "#wrapper",
            classes: [],
            dataAttrs: [],
            semantic: [],
          },
        }),
        seg("p", {
          attributes: { classes: ["intro"], dataAttrs: [], semantic: [] },
        }),
      ],
    };
    const levels: Set<SpecificityLevel> = new Set(["attributes", "structural"]);
    expect(serialize(sel, levels)).toBe("p.intro");
  });

  it("uses only tag names when attributes excluded", () => {
    const sel: StructuredSelector = {
      segments: [
        seg("div", {
          attributes: {
            id: "#wrapper",
            classes: [],
            dataAttrs: [],
            semantic: [],
          },
        }),
        seg("p", {
          attributes: { classes: ["intro"], dataAttrs: [], semantic: [] },
        }),
      ],
    };
    const levels: Set<SpecificityLevel> = new Set(["containers"]);
    expect(serialize(sel, levels)).toBe("div > p");
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
    expect(result).toBeNull();
  });
});
