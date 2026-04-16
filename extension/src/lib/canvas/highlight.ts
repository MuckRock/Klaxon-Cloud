let currentHoverEl: Element | null = null;
let currentSelectionEl: Element | null = null;
let savedBackground: string = "";

/** Resolve the effective background: use the element's own if non-transparent, else walk up. */
function resolveBackground(el: Element | null): string {
  if (!el) return "white";
  const bg = getComputedStyle(el).backgroundColor;
  if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg;
  return resolveBackground(el.parentElement);
}

export function applyHover(el: Element): void {
  if (currentHoverEl && currentHoverEl !== el) {
    (currentHoverEl as HTMLElement).style.backgroundColor = savedBackground;
    currentHoverEl.classList.remove("klaxon-hover");
  }
  const htmlEl = el as HTMLElement;
  savedBackground = htmlEl.style.backgroundColor;
  const bg = resolveBackground(el);
  console.debug("[klaxon hover]", el.nodeName, "bg:", bg);
  htmlEl.style.backgroundColor = bg;
  el.classList.add("klaxon-hover");
  currentHoverEl = el;
}

export function applySelection(el: Element): void {
  if (currentSelectionEl && currentSelectionEl !== el) {
    console.debug("[klaxon selection] removing from", currentSelectionEl.nodeName);
    currentSelectionEl.classList.remove("klaxon-selection");
  }
  document.body.classList.add("klaxon-overlay");
  console.debug("[klaxon selection]", el.nodeName);
  el.classList.add("klaxon-selection");
  currentSelectionEl = el;
}

export function clearSelection(): void {
  console.debug("[klaxon clearSelection]");
  if (currentSelectionEl) {
    currentSelectionEl.classList.remove("klaxon-selection");
    currentSelectionEl = null;
  }
  document.body.classList.remove("klaxon-overlay");
}

export function clearHover(): void {
  console.debug("[klaxon clearHover]");
  if (currentHoverEl) {
    (currentHoverEl as HTMLElement).style.backgroundColor = savedBackground;
    currentHoverEl.classList.remove("klaxon-hover");
    currentHoverEl = null;
    savedBackground = "";
  }
}

export function clearAll(): void {
  console.debug("[klaxon clearAll]");
  if (currentHoverEl) {
    (currentHoverEl as HTMLElement).style.backgroundColor = savedBackground;
    currentHoverEl.classList.remove("klaxon-hover");
  }
  currentSelectionEl?.classList.remove("klaxon-selection");
  document.body.classList.remove("klaxon-overlay");
  currentHoverEl = null;
  currentSelectionEl = null;
  savedBackground = "";
}
