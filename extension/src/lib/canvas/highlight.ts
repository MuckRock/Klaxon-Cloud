let shadowRoot: ShadowRoot | null = null;
let hoverOverlay: HTMLDivElement | null = null;
let selectionOverlay: HTMLDivElement | null = null;

let currentHoverEl: Element | null = null;
let currentSelectionEl: Element | null = null;
let savedBackground: string = "";

/** Resolve the effective background: walk up until we find a non-transparent one. */
function resolveBackground(el: Element | null): string {
  if (!el) return "white";
  const bg = getComputedStyle(el).backgroundColor;
  if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg;
  return resolveBackground(el.parentElement);
}

const OVERLAY_BASE_STYLE = `
  position: fixed;
  pointer-events: none;
  z-index: 2147483646;
  display: none;
  box-sizing: border-box;
`;

function createOverlay(id: string, extraStyle: string): HTMLDivElement {
  const div = document.createElement("div");
  div.id = id;
  div.style.cssText = OVERLAY_BASE_STYLE + extraStyle;
  return div;
}

function positionOverlay(overlay: HTMLDivElement, el: Element): void {
  const rect = el.getBoundingClientRect();
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = "block";
}

function hideOverlay(overlay: HTMLDivElement): void {
  overlay.style.display = "none";
}

/** Create overlay divs and attach them to the shadow root. */
export function initHighlight(root: ShadowRoot): void {
  shadowRoot = root;

  hoverOverlay = createOverlay(
    "klaxon-hover-overlay",
    `
    border-radius: 0.375rem;
    outline: 3px solid rgba(39, 198, 162, 0.8);
    outline-offset: 2px;
    box-shadow: 0 0 8px 4px rgba(39, 198, 162, 0.40);
    `,
  );

  selectionOverlay = createOverlay(
    "klaxon-selection-overlay",
    `
    border-radius: 0.375rem;
    outline: 4px solid #1EBE38;
    outline-offset: 0;
    `,
  );

  shadowRoot.appendChild(hoverOverlay);
  shadowRoot.appendChild(selectionOverlay);
}

export function applyHover(el: Element): void {
  if (!hoverOverlay) return;
  currentHoverEl = el;
  positionOverlay(hoverOverlay, el);
}

export function applySelection(el: Element): void {
  if (!selectionOverlay) return;

  // Clear previous selection's punch-through
  if (currentSelectionEl && currentSelectionEl !== el) {
    (currentSelectionEl as HTMLElement).style.backgroundColor = savedBackground;
    currentSelectionEl.classList.remove("klaxon-selection");
  }

  // Punch-through: raise element above the dimming overlay
  const htmlEl = el as HTMLElement;
  savedBackground = htmlEl.style.backgroundColor;
  htmlEl.style.backgroundColor = resolveBackground(el);
  el.classList.add("klaxon-selection");

  // Dimming overlay on body
  document.body.classList.add("klaxon-overlay");

  currentSelectionEl = el;
  positionOverlay(selectionOverlay, el);
}

export function clearHover(): void {
  if (hoverOverlay) hideOverlay(hoverOverlay);
  currentHoverEl = null;
}

export function clearSelection(): void {
  if (selectionOverlay) hideOverlay(selectionOverlay);
  if (currentSelectionEl) {
    (currentSelectionEl as HTMLElement).style.backgroundColor = savedBackground;
    currentSelectionEl.classList.remove("klaxon-selection");
    currentSelectionEl = null;
    savedBackground = "";
  }
  document.body.classList.remove("klaxon-overlay");
}

export function clearAll(): void {
  clearHover();
  clearSelection();
}

/** Reposition visible overlays to match their tracked elements. */
export function updatePositions(): void {
  if (currentHoverEl && hoverOverlay) {
    positionOverlay(hoverOverlay, currentHoverEl);
  }
  if (currentSelectionEl && selectionOverlay) {
    positionOverlay(selectionOverlay, currentSelectionEl);
  }
}

/** Remove overlay divs from the shadow root. */
export function destroyHighlight(): void {
  clearAll();
  hoverOverlay?.remove();
  selectionOverlay?.remove();
  hoverOverlay = null;
  selectionOverlay = null;
  shadowRoot = null;
}
