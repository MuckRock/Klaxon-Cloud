/** Escape special CSS selector characters in a class name or id. */
function cssEscape(value: string): string {
  return value.replace(/([^\w-])/g, "\\$1");
}

/** Build a CSS selector string for a single element (tag#id.class1.class2). */
export function selectorForElement(el: Element): string {
  const tag = el.nodeName.toLowerCase();
  const id = el.id ? "#" + cssEscape(el.id) : "";
  const KLAXON_CLASSES = ["klaxon-hover", "klaxon-selection", "klaxon-overlay"];
  const classes = el.className
    ? el.className
        .trim()
        .split(/\s+/)
        .filter((c) => c && !KLAXON_CLASSES.includes(c))
        .map((c) => "." + cssEscape(c))
        .join("")
    : "";
  return tag + id + classes;
}

/**
 * Walk up the DOM from `el` to build a full CSS path, then return only the
 * deepest (most specific) segment — the one callers actually need.
 */
export function deepestSelector(el: Element): string {
  if (el.nodeName.toLowerCase() === "body") return "";
  return selectorForElement(el);
}

/** Resolve the element under the cursor, ignoring a given host container. */
export function resolveTarget(
  evt: MouseEvent,
  host: HTMLElement,
): { selector: string; matchText: string } | null {
  const el = document.elementFromPoint(evt.clientX, evt.clientY);
  if (!el || host.contains(el)) return null;

  const selector = deepestSelector(el);
  if (!selector) return null;

  let matched: Element | null;
  try {
    matched = document.querySelector(selector);
  } catch {
    return null;
  }
  const matchText = matched?.textContent?.trim().slice(0, 200) ?? "";
  return { selector, matchText };
}
