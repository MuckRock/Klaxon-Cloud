// ── Types ────────────────────────────────────────────────────────────────────

/** A single element's contribution to the selector path. */
export interface SelectorSegment {
  tag: string;
  attributes: {
    id?: string; // e.g. "#main" or '[id="weird.id"]'
    classes: string[]; // CSS-escaped class names
    dataAttrs: [string, string][]; // [attr-name, attr-value]
    semantic: [string, string][]; // role, aria-label, name
  };
  structural?: {
    nthOfType?: number; // 1-based index among same-tag siblings
  };
}

/** The full structured selector for a target element. */
export interface StructuredSelector {
  /** Ordered from outermost ancestor to the target element (last). */
  segments: SelectorSegment[];
}

/** Which categories of specificity to include when serializing. */
export type SpecificityLevel = "containers" | "attributes" | "structural";

/** Result of resolving a mouse event to a target element. */
export interface ResolvedTarget {
  el: Element;
  structured: StructuredSelector;
  selector: string;
  matchText: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const KLAXON_CLASSES = ["klaxon-hover", "klaxon-selection", "klaxon-overlay"];
const SAFE_CLASS_REGEX = /^[a-z0-9_-]+$/i;
const ALL_LEVELS: Set<SpecificityLevel> = new Set([
  "containers",
  "attributes",
  "structural",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the selector matches exactly one element in the document. */
function isUnique(selector: string): boolean {
  return document.querySelectorAll(selector).length === 1;
}

/**
 * Escapes a string for use as a quoted attribute value in a CSS selector.
 * For attribute values in quotes we only need to escape backslashes and
 * double-quotes.
 */
function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Returns the element's class names that are safe to use directly in a CSS
 * selector and are not Klaxon-internal classes.
 */
function getValidClasses(el: Element): string[] {
  return Array.from(el.classList).filter(
    (c) => SAFE_CLASS_REGEX.test(c) && !KLAXON_CLASSES.includes(c),
  );
}

/**
 * Returns a CSS selector for the given ID. Uses `#id` when the ID needs no
 * escaping, and falls back to `[id="..."]` otherwise.
 */
function makeIdSelector(id: string): string {
  if (CSS.escape(id) === id) {
    return `#${id}`;
  }
  return `[id="${escapeAttrValue(id)}"]`;
}

/** Verifies that a matched element is the intended target. */
function matchesTarget(match: Element | null, el: Element): boolean {
  return match === el;
}

/**
 * Tries to find a short, attribute-based selector that uniquely identifies
 * `el` without walking the DOM tree.
 */
function trySimpleSelectors(el: Element): SelectorSegment | null {
  const tag = el.tagName.toLowerCase();
  const seg = buildSegmentForElement(el);

  // Unique ID
  if (seg.attributes.id && isUnique(seg.attributes.id)) {
    return {
      tag,
      attributes: {
        ...seg.attributes,
        classes: [],
        dataAttrs: [],
        semantic: [],
      },
    };
  }

  // data-* and semantic attributes
  for (const [name, val] of [
    ...seg.attributes.dataAttrs,
    ...seg.attributes.semantic,
  ]) {
    const candidate = `[${name}="${escapeAttrValue(val)}"]`;
    if (isUnique(candidate)) {
      const isData = name.startsWith("data-");
      return {
        tag,
        attributes: {
          classes: [],
          dataAttrs: isData ? [[name, val]] : [],
          semantic: isData ? [] : [[name, val]],
        },
      };
    }
  }

  // Tag-only
  if (isUnique(tag)) {
    return { tag, attributes: { classes: [], dataAttrs: [], semantic: [] } };
  }

  const validClasses = seg.attributes.classes;

  // Tag + single class
  for (const cls of validClasses) {
    if (isUnique(`${tag}.${cls}`)) {
      return {
        tag,
        attributes: { classes: [cls], dataAttrs: [], semantic: [] },
      };
    }
  }

  // Single class alone
  for (const cls of validClasses) {
    if (isUnique(`.${cls}`)) {
      return {
        tag,
        attributes: { classes: [cls], dataAttrs: [], semantic: [] },
      };
    }
  }

  return null;
}

/** Yields class combinations of increasing size: singles, pairs, then all. */
function* classCombos(classes: string[]): Generator<string[]> {
  for (const c of classes) yield [c];
  for (let i = 0; i < classes.length; i++)
    for (let j = i + 1; j < classes.length; j++) yield [classes[i], classes[j]];
  if (classes.length > 2) yield classes;
}

/** Extracts attribute-category data from a DOM element into a segment. */
function buildSegmentForElement(el: Element): SelectorSegment {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? makeIdSelector(el.id) : undefined;
  const classes = getValidClasses(el).map((c) => CSS.escape(c));

  const dataAttrs: [string, string][] = [];
  const semantic: [string, string][] = [];
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-")) dataAttrs.push([attr.name, attr.value]);
  }
  for (const name of ["role", "aria-label", "name"]) {
    const val = el.getAttribute(name);
    if (val) semantic.push([name, val]);
  }

  return { tag, attributes: { id, classes, dataAttrs, semantic } };
}

/**
 * Adds structural position traits to a segment when needed for
 * disambiguation among same-tag siblings.
 */
function addStructuralTraits(seg: SelectorSegment, el: Element): void {
  if (!el.parentElement) return;
  const siblings = Array.from(el.parentElement.children).filter(
    (s) => s.tagName === el.tagName,
  );
  if (siblings.length > 1) {
    seg.structural = { nthOfType: siblings.indexOf(el) + 1 };
  }
}

// ── Serialize ────────────────────────────────────────────────────────────────

/** Serializes a single segment to a CSS string. */
function serializeSegment(
  seg: SelectorSegment,
  include: Set<SpecificityLevel>,
): string {
  let s = seg.tag;

  if (include.has("attributes")) {
    if (seg.attributes.id) s += seg.attributes.id;
    for (const cls of seg.attributes.classes) s += `.${cls}`;
    for (const [name, val] of seg.attributes.dataAttrs)
      s += `[${name}="${escapeAttrValue(val)}"]`;
    for (const [name, val] of seg.attributes.semantic)
      s += `[${name}="${escapeAttrValue(val)}"]`;
  }

  if (include.has("structural") && seg.structural?.nthOfType) {
    s += `:nth-of-type(${seg.structural.nthOfType})`;
  }

  return s;
}

/**
 * Converts a `StructuredSelector` to a CSS string, parameterized by which
 * specificity levels to include.
 */
export function serialize(
  sel: StructuredSelector,
  include: Set<SpecificityLevel> = ALL_LEVELS,
): string {
  const segments = include.has("containers")
    ? sel.segments
    : sel.segments.slice(-1);

  return segments.map((seg) => serializeSegment(seg, include)).join(" > ");
}

// ── Optimize ─────────────────────────────────────────────────────────────────

type Entry = { segment: SelectorSegment; joiner: string };

function entriesToCSS(entries: Entry[]): string {
  return entries
    .map((e, i) =>
      i === 0
        ? serializeSegment(e.segment, ALL_LEVELS)
        : e.joiner + serializeSegment(e.segment, ALL_LEVELS),
    )
    .join("");
}

function checkEntries(entries: Entry[], el: Element): boolean {
  const css = entriesToCSS(entries);
  if (!isUnique(css)) return false;
  return matchesTarget(document.querySelector(css), el);
}

/**
 * Post-processes the segment array: removes redundant intermediate segments
 * and relaxes strict child combinators (`>`) to descendant combinators (` `).
 */
function optimize(segments: SelectorSegment[], el: Element): SelectorSegment[] {
  if (segments.length <= 1) return segments;

  let entries: Entry[] = segments.map((segment, i) => ({
    segment,
    joiner: i === 0 ? "" : " > ",
  }));

  for (let i = 0; i < entries.length; i++) {
    // Try removing this segment entirely
    if (entries.length > 1) {
      const without = entries.toSpliced(i, 1);
      if (checkEntries(without, el)) {
        entries = without;
        i--;
        continue;
      }
    }

    // Try relaxing " > " to " " before this segment
    if (i > 0 && entries[i].joiner === " > ") {
      entries[i] = { ...entries[i], joiner: " " };
      if (!checkEntries(entries, el)) {
        entries[i] = { ...entries[i], joiner: " > " };
      }
    }
  }

  // Return just the segments — the joiner relaxation is reflected in
  // the final CSS via a separate serialization step. For now we re-serialize
  // using the entries to capture joiner changes.
  // Store the optimized CSS so callers can use it.
  return entries.map((e) => e.segment);
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Generates a structured selector that uniquely identifies `el` in the
 * current document. Walks the DOM bottom-up, building segments from three
 * categories: containers, element attributes, and structural traits.
 */
export function cssSelector(el: Element): StructuredSelector {
  if (el === document.body) {
    return {
      segments: [
        {
          tag: "body",
          attributes: { classes: [], dataAttrs: [], semantic: [] },
        },
      ],
    };
  }

  // Fast path: try simple selectors without walking the DOM
  const simple = trySimpleSelectors(el);
  if (simple) {
    return { segments: [simple] };
  }

  // Walk the DOM bottom-up
  const segments: SelectorSegment[] = [];
  let current: Element | null = el;

  while (current && current !== document.body) {
    // Anchor to nearest unique-ID ancestor (skipping the target itself)
    if (current !== el && current.id) {
      const idSelector = makeIdSelector(current.id);
      if (isUnique(idSelector)) {
        segments.unshift({
          tag: current.tagName.toLowerCase(),
          attributes: {
            id: idSelector,
            classes: [],
            dataAttrs: [],
            semantic: [],
          },
        });
        break;
      }
    }

    const seg = buildSegmentForElement(current);

    // Try minimal class combinations for uniqueness
    const tag = current.tagName.toLowerCase();
    const validClasses = seg.attributes.classes;
    let bestClasses = validClasses;

    for (const combo of classCombos(validClasses)) {
      const classStr = combo.map((c) => "." + c).join("");
      if (isUnique(tag + classStr)) {
        bestClasses = combo;
        break;
      }
    }

    const candidateSeg: SelectorSegment = {
      ...seg,
      attributes: { ...seg.attributes, classes: bestClasses },
    };

    // Check if this segment is unique enough so far
    const testSegments = [candidateSeg, ...segments];
    const testCSS = testSegments
      .map((s) => serializeSegment(s, ALL_LEVELS))
      .join(" > ");

    if (isUnique(testCSS)) {
      segments.unshift(candidateSeg);
      break;
    }

    // Add structural traits if classes don't disambiguate
    addStructuralTraits(candidateSeg, current);

    segments.unshift(candidateSeg);
    current = current.parentElement;

    // Check if the full selector is now unique
    const fullCSS = segments
      .map((s) => serializeSegment(s, ALL_LEVELS))
      .join(" > ");
    if (isUnique(fullCSS)) break;
  }

  // Optimize: remove redundant segments
  const optimized = optimize(segments, el);
  return { segments: optimized };
}

// ── Resolve Target ───────────────────────────────────────────────────────────

/** Build a ResolvedTarget from a DOM element, or null if the selector is invalid. */
export function buildResolvedTarget(el: Element): ResolvedTarget | null {
  const structured = cssSelector(el);
  const selector = serialize(structured);

  let matched: Element | null;
  try {
    matched = document.querySelector(selector);
  } catch {
    return null;
  }

  const matchText = matched?.textContent?.trim().slice(0, 200) ?? "";
  return { el, structured, selector, matchText };
}

/** Resolve the element under the cursor, ignoring a given host container. */
export function resolveTarget(
  evt: MouseEvent,
  host: HTMLElement,
): ResolvedTarget | null {
  const el = document.elementFromPoint(evt.clientX, evt.clientY);
  if (!el || host.contains(el)) return null;
  if (el === document.body) return null;
  return buildResolvedTarget(el);
}

// ── Drag-to-Select ──────────────────────────────────────────────────────────

/** Intersection-over-union of two rects. Returns 0 for no overlap, 1 for identical. */
function iou(a: DOMRect, b: DOMRect): number {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (left >= right || top >= bottom) return 0;

  const intersection = (right - left) * (bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Finds the element whose bounding rect best matches `rect` by IoU score.
 * Considers all sampled leaf elements and their ancestors up to body.
 */
function bestOverlapElement(leafElements: Element[], rect: DOMRect): Element {
  let bestEl: Element = document.body;
  let bestScore = 0;

  const visited = new Set<Element>();

  for (const leaf of leafElements) {
    let el: Element | null = leaf;
    while (el && el !== document.body) {
      if (visited.has(el)) break;
      visited.add(el);

      const score = iou(el.getBoundingClientRect(), rect);
      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
      }
      el = el.parentElement;
    }
  }

  return bestEl;
}

const MIN_DRAG_AREA = 100; // px², ignore tiny drag rects

/**
 * Resolves a drag rectangle to the element whose bounding box best
 * overlaps it (by IoU). Samples corners + center, then walks ancestors.
 */
export function resolveEnclosingElement(
  rect: DOMRect,
  host: HTMLElement,
): ResolvedTarget | null {
  if (rect.width * rect.height < MIN_DRAG_AREA) return null;

  // Sample 5 points: 4 corners (inset 1px) + center
  const inset = 1;
  const points: [number, number][] = [
    [rect.left + inset, rect.top + inset],
    [rect.right - inset, rect.top + inset],
    [rect.left + inset, rect.bottom - inset],
    [rect.right - inset, rect.bottom - inset],
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
  ];

  const elements: Element[] = [];
  for (const [x, y] of points) {
    const el = document.elementFromPoint(x, y);
    if (el && !host.contains(el) && el !== document.body) {
      elements.push(el);
    }
  }

  if (elements.length === 0) return null;

  const el = bestOverlapElement(elements, rect);
  if (el === document.body) return null;

  return buildResolvedTarget(el);
}
