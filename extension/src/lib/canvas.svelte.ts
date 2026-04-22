import { mount, unmount } from "svelte";
import {
  resolveTarget,
  resolveEnclosingElement,
  buildResolvedTarget,
  type StructuredSelector,
} from "./selector";
import ApertureBar from "./components/ApertureBar.svelte";

export interface CanvasState {
  readonly mouse: { x: number; y: number };
  readonly selector: string;
  readonly matchText: string;
  readonly locked: boolean;
  readonly dragging: boolean;
  readonly structured?: StructuredSelector;
}

export interface Canvas {
  readonly state: CanvasState;
  clearSelection(): void;
  destroy(): void;
}

/** Computes a clip-path that covers the viewport with a cutout for `el`. */
function clipPathCutout(el: Element): string {
  const { left, top, right, bottom } = el.getBoundingClientRect();
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
}

const DRAG_THRESHOLD = 5;

export function initCanvas(
  host: HTMLElement,
  shadow: ShadowRoot,
  sidebarWidth: number,
): Canvas {
  let mouse = $state({ x: 0, y: 0 });
  let selector = $state("");
  let matchText = $state("");
  let locked = $state(false);
  let dragging = $state(false);
  let structured = $state<StructuredSelector | undefined>(undefined);

  let hoverEl: Element | null = null;
  let selectionEl: Element | null = null;
  let mouseDownPos: { x: number; y: number } | null = null;
  let apertureTarget = $state<Element | null>(null);

  // Prevent text selection on the page while the extension is active
  const prevUserSelect = document.body.style.userSelect;
  document.body.style.userSelect = "none";

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

  const dismissBtn = document.createElement("button");
  dismissBtn.setAttribute("aria-label", "Clear selection");
  dismissBtn.textContent = "\u00d7";
  dismissBtn.style.cssText =
    "position:fixed; pointer-events:auto; z-index:2147483647; display:none; box-sizing:border-box; width:28px; height:28px; border-radius:50%; border:2px solid #1EBE38; background:#1EBE38; color:#fff; font-size:24px; line-height:1; cursor:pointer; padding:0; text-align:center;";
  dismissBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    clearSelection();
  });

  const dragDiv = document.createElement("div");
  dragDiv.style.cssText =
    "position:fixed; pointer-events:none; z-index:2147483645; display:none; box-sizing:border-box; border:2px dashed rgba(39,198,162,0.8); background:rgba(39,198,162,0.08);";

  shadow.appendChild(dimming);
  shadow.appendChild(hoverDiv);
  shadow.appendChild(selectionDiv);
  shadow.appendChild(dismissBtn);
  shadow.appendChild(dragDiv);

  // ── Aperture control bar ────────────────────────────────────────────────

  const apertureMountPoint = document.createElement("div");
  shadow.appendChild(apertureMountPoint);

  const apertureBar = mount(ApertureBar, {
    target: apertureMountPoint,
    props: {
      get target() {
        return apertureTarget;
      },
      sidebarWidth,
      host,
      onselect(el: Element) {
        const resolved = buildResolvedTarget(el);
        if (!resolved) return;
        selector = resolved.selector;
        matchText = resolved.matchText;
        structured = resolved.structured;
        selectionEl = el;
        showSelection(el);
      },
    },
  });

  // ── Overlay helpers ──────────────────────────────────────────────────────

  function positionAt(div: HTMLDivElement, el: Element) {
    const { top, left, width, height } = el.getBoundingClientRect();
    div.style.top = `${top}px`;
    div.style.left = `${left}px`;
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    div.style.display = "block";
  }

  const EDGE_PAD = 4;
  const BTN_SIZE = 24;
  const BTN_OFFSET = 12; // how far from the selection corner the button sits

  function showSelection(el: Element) {
    positionAt(selectionDiv, el);
    dimming.style.clipPath = clipPathCutout(el);
    dimming.style.display = "block";

    // Position dismiss button at top-right of selection, clamped to viewport
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let btnLeft = rect.right - BTN_OFFSET;
    let btnTop = rect.top - BTN_SIZE + BTN_OFFSET;

    // Clamp to keep at least EDGE_PAD from each viewport edge and the sidebar
    const rightEdge = vw - sidebarWidth;
    btnLeft = Math.max(EDGE_PAD, Math.min(btnLeft, rightEdge - BTN_SIZE - EDGE_PAD));
    btnTop = Math.max(EDGE_PAD, Math.min(btnTop, vh - BTN_SIZE - EDGE_PAD));

    dismissBtn.style.left = `${btnLeft}px`;
    dismissBtn.style.top = `${btnTop}px`;
    dismissBtn.style.display = "block";
  }

  function hideHover() {
    hoverDiv.style.display = "none";
    hoverEl = null;
  }

  function hideSelection() {
    selectionDiv.style.display = "none";
    dimming.style.display = "none";
    dismissBtn.style.display = "none";
    selectionEl = null;
  }

  function hideDrag() {
    dragDiv.style.display = "none";
    dragging = false;
  }

  function clearSelection() {
    hideHover();
    hideSelection();
    hideApertureBar();
    selector = "";
    matchText = "";
    structured = undefined;
    locked = false;
  }

  function showApertureBar(el: Element) {
    apertureTarget = el;
  }

  function hideApertureBar() {
    apertureTarget = null;
  }

  /** Build a DOMRect from the mousedown origin to the current mouse position. */
  function dragRectFrom(x: number, y: number): DOMRect {
    const left = Math.min(mouseDownPos!.x, x);
    const top = Math.min(mouseDownPos!.y, y);
    const width = Math.abs(x - mouseDownPos!.x);
    const height = Math.abs(y - mouseDownPos!.y);
    return new DOMRect(left, top, width, height);
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  function onClick(evt: MouseEvent) {
    if (host.contains(evt.target as Node)) return;
    evt.preventDefault();
    evt.stopPropagation();
  }

  function onMouseDown(evt: MouseEvent) {
    if (host.contains(evt.target as Node)) return;
    evt.preventDefault();
    if (locked) return;
    mouseDownPos = { x: evt.clientX, y: evt.clientY };
  }

  function onMouseMove(evt: MouseEvent) {
    mouse = { x: evt.clientX, y: evt.clientY };

    // If mouse is down, check for drag
    if (mouseDownPos && !locked) {
      const dx = evt.clientX - mouseDownPos.x;
      const dy = evt.clientY - mouseDownPos.y;

      if (
        !dragging &&
        (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
      ) {
        dragging = true;
        hideHover();
      }

      if (dragging) {
        const rect = dragRectFrom(evt.clientX, evt.clientY);
        dragDiv.style.left = `${rect.left}px`;
        dragDiv.style.top = `${rect.top}px`;
        dragDiv.style.width = `${rect.width}px`;
        dragDiv.style.height = `${rect.height}px`;
        dragDiv.style.display = "block";

        // Live preview: show hover outline on the enclosing element
        const enclosing = resolveEnclosingElement(rect, host);
        if (enclosing) {
          hoverEl = enclosing.el;
          positionAt(hoverDiv, enclosing.el);
        } else {
          hideHover();
        }
        return;
      }
    }

    // Normal hover behavior
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

  function onMouseUp(evt: MouseEvent) {
    if (!mouseDownPos) return;

    if (host.contains(evt.target as Node)) {
      mouseDownPos = null;
      hideDrag();
      return;
    }

    if (dragging) {
      // Complete drag selection
      evt.preventDefault();
      evt.stopPropagation();

      const rect = dragRectFrom(evt.clientX, evt.clientY);
      hideDrag();
      hideHover();

      const target = resolveEnclosingElement(rect, host);
      if (target) {
        selector = target.selector;
        matchText = target.matchText;
        structured = target.structured;
        locked = true;
        selectionEl = target.el;
        showSelection(target.el);
        showApertureBar(target.el);
      }

      mouseDownPos = null;
      return;
    }

    // Sub-threshold: treat as click
    mouseDownPos = null;

    evt.preventDefault();
    evt.stopPropagation();

    const target = resolveTarget(evt, host);
    if (!target) return;

    hideHover();

    if (locked && target.selector !== selector) {
      hideSelection();
      hideApertureBar();
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
    showApertureBar(target.el);
  }

  function onScrollOrResize() {
    if (hoverEl) positionAt(hoverDiv, hoverEl);
    if (selectionEl) showSelection(selectionEl);
  }

  // ── Listeners ────────────────────────────────────────────────────────────

  window.addEventListener("click", onClick, true);
  window.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp, true);
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
        get dragging() {
          return dragging;
        },
        get structured() {
          return structured;
        },
      };
    },
    clearSelection,
    destroy() {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp, true);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.body.style.userSelect = prevUserSelect;
      dimming.remove();
      hoverDiv.remove();
      selectionDiv.remove();
      dismissBtn.remove();
      dragDiv.remove();
      unmount(apertureBar);
      apertureMountPoint.remove();
    },
  };
}
