const STYLE_ID = "klaxon-canvas-css";

const CSS = `
.klaxon-overlay::after {
  content: "";
  position: fixed;
  inset: 0;
  background: rgba(14, 30, 40, 0.66);
  pointer-events: none;
  z-index: 2147483640;
}
.klaxon-selection {
  position: relative;
  z-index: 2147483641 !important;
}
`;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}
