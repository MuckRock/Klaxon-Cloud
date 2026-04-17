import {
  resolveTarget,
  type StructuredSelector,
} from "../content/selector";

export interface CanvasState {
  readonly mouse: { x: number; y: number };
  readonly selector: string;
  readonly matchText: string;
  readonly locked: boolean;
  readonly structured?: StructuredSelector;
}

export interface Canvas {
  readonly state: CanvasState;
  destroy(): void;
}

/** Computes a clip-path that covers the viewport with a cutout for `el`. */
function clipPathCutout(el: Element): string {
  const { left, top, right, bottom } = el.getBoundingClientRect();
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
}

export function initCanvas(host: HTMLElement, shadow: ShadowRoot): Canvas {
  let mouse = $state({ x: 0, y: 0 });
  let selector = $state("");
  let matchText = $state("");
  let locked = $state(false);
  let structured = $state<StructuredSelector | undefined>(undefined);

  let hoverEl: Element | null = null;
  let selectionEl: Element | null = null;

  // ── Overlay divs ─────────────────────────────────────────────────────────

  const dimming = document.createElement("div");
  dimming.style.cssText =
    "position:fixed; inset:0; pointer-events:none; z-index:2147483640; display:none; background:rgba(14,30,40,0.66);";

  const hoverDiv = document.createElement("div");
  hoverDiv.style.cssText =
    "position:fixed; pointer-events:none; z-index:2147483646; display:none; box-sizing:border-box; border-radius:0.375rem; outline:3px solid rgba(39,198,162,0.8); outline-offset:2px; box-shadow:0 0 8px 4px rgba(39,198,162,0.4);";

  const selectionDiv = document.createElement("div");
  selectionDiv.style.cssText =
    "position:fixed; pointer-events:none; z-index:2147483646; display:none; box-sizing:border-box; border-radius:0.375rem; outline:4px solid #1EBE38; outline-offset:0;";

  shadow.appendChild(dimming);
  shadow.appendChild(hoverDiv);
  shadow.appendChild(selectionDiv);

  // ── Overlay helpers ──────────────────────────────────────────────────────

  function positionAt(div: HTMLDivElement, el: Element) {
    const { top, left, width, height } = el.getBoundingClientRect();
    div.style.top = `${top}px`;
    div.style.left = `${left}px`;
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    div.style.display = "block";
  }

  function showSelection(el: Element) {
    positionAt(selectionDiv, el);
    dimming.style.clipPath = clipPathCutout(el);
    dimming.style.display = "block";
  }

  function hideHover() {
    hoverDiv.style.display = "none";
    hoverEl = null;
  }

  function hideSelection() {
    selectionDiv.style.display = "none";
    dimming.style.display = "none";
    selectionEl = null;
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  function onMouseMove(evt: MouseEvent) {
    mouse = { x: evt.clientX, y: evt.clientY };
    if (locked) return;

    const target = resolveTarget(evt, host);
    if (!target) {
      hideHover();
      return;
    }

    selector = target.selector;
    matchText = target.matchText;
    structured = target.structured;
    hoverEl = target.el;
    positionAt(hoverDiv, target.el);
  }

  function onClick(evt: MouseEvent) {
    if (host.contains(evt.target as Node)) return;

    evt.preventDefault();
    evt.stopPropagation();

    const target = resolveTarget(evt, host);
    if (!target) return;

    hideHover();

    if (locked && target.selector !== selector) {
      hideSelection();
      selector = "";
      matchText = "";
      structured = undefined;
      locked = false;
      return;
    }

    selector = target.selector;
    matchText = target.matchText;
    structured = target.structured;
    locked = true;
    selectionEl = target.el;
    showSelection(target.el);
  }

  function onScrollOrResize() {
    if (hoverEl) positionAt(hoverDiv, hoverEl);
    if (selectionEl) showSelection(selectionEl);
  }

  // ── Listeners ────────────────────────────────────────────────────────────

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick, true);
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);

  return {
    get state() {
      return {
        get mouse() {
          return mouse;
        },
        get selector() {
          return selector;
        },
        get matchText() {
          return matchText;
        },
        get locked() {
          return locked;
        },
        get structured() {
          return structured;
        },
      };
    },
    destroy() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      dimming.remove();
      hoverDiv.remove();
      selectionDiv.remove();
    },
  };
}
