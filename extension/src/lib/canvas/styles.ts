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
.klaxon-hover {
  position: relative;
  z-index: 2147483641;
}
.klaxon-hover::after {
  content: "";
  position: absolute;
  inset: 0;
  cursor: pointer;
  border-radius: 0.375rem;
  background: rgba(39, 198, 162, 0.40);
  background-blend-mode: overlay;
  box-shadow: 0 0 8px 8px rgba(39, 198, 162, 0.40);
}
.klaxon-selection {
  position: relative;
  z-index: 2147483641 !important;
}
.klaxon-selection::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 0.375rem;
  box-shadow: 0 0 0 4px #1EBE38;
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
