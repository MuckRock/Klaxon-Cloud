let shadowRoot: ShadowRoot | null = null;
let hoverOverlay: HTMLDivElement | null = null;
let selectionOverlay: HTMLDivElement | null = null;
let dimmingOverlay: HTMLDivElement | null = null;

let currentHoverEl: Element | null = null;
let currentSelectionEl: Element | null = null;

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

/**
 * Computes a clip-path polygon that covers the entire viewport with a
 * rectangular cutout at the given element's bounding box.
 */
function clipPathCutout(el: Element): string {
  const rect = el.getBoundingClientRect();
  const l = `${rect.left}px`;
  const t = `${rect.top}px`;
  const r = `${rect.right}px`;
  const b = `${rect.bottom}px`;

  // evenodd: outer rect (full viewport) with an inner rect (cutout)
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l} ${t}, ${r} ${t}, ${r} ${b}, ${l} ${b}, ${l} ${t})`;
}

function showDimming(el: Element): void {
  if (!dimmingOverlay) return;
  dimmingOverlay.style.clipPath = clipPathCutout(el);
  dimmingOverlay.style.display = "block";
}

function hideDimming(): void {
  if (!dimmingOverlay) return;
  dimmingOverlay.style.display = "none";
}

/** Create overlay divs and attach them to the shadow root. */
export function initHighlight(root: ShadowRoot): void {
  shadowRoot = root;

  dimmingOverlay = createOverlay(
    "klaxon-dimming-overlay",
    `
    inset: 0;
    z-index: 2147483640;
    background: rgba(14, 30, 40, 0.66);
    `,
  );

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

  shadowRoot.appendChild(dimmingOverlay);
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
  currentSelectionEl = el;
  positionOverlay(selectionOverlay, el);
  showDimming(el);
}

export function clearHover(): void {
  if (hoverOverlay) hideOverlay(hoverOverlay);
  currentHoverEl = null;
}

export function clearSelection(): void {
  if (selectionOverlay) hideOverlay(selectionOverlay);
  hideDimming();
  currentSelectionEl = null;
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
    showDimming(currentSelectionEl);
  }
}

/** Remove overlay divs from the shadow root. */
export function destroyHighlight(): void {
  clearAll();
  dimmingOverlay?.remove();
  hoverOverlay?.remove();
  selectionOverlay?.remove();
  dimmingOverlay = null;
  hoverOverlay = null;
  selectionOverlay = null;
  shadowRoot = null;
}
