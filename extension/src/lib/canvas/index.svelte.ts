import {
  resolveTarget,
  type StructuredSelector,
} from "../../content/selector";
import {
  initHighlight,
  destroyHighlight,
  applyHover,
  applySelection,
  clearAll,
  clearHover,
  clearSelection,
  updatePositions,
} from "./highlight";
import { injectStyles, removeStyles } from "./styles";

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

export function initCanvas(host: HTMLElement, shadow: ShadowRoot): Canvas {
  let mouse = $state({ x: 0, y: 0 });
  let selector = $state("");
  let matchText = $state("");
  let locked = $state(false);
  let structured = $state<StructuredSelector | undefined>(undefined);

  injectStyles();
  initHighlight(shadow);
  console.debug("[klaxon canvas] initialized");

  function onMouseMove(evt: MouseEvent) {
    mouse = { x: evt.clientX, y: evt.clientY };

    if (locked) return;

    const target = resolveTarget(evt, host);
    if (!target) {
      clearHover();
      return;
    }

    console.debug("[klaxon canvas] mousemove →", target.selector);
    selector = target.selector;
    matchText = target.matchText;
    structured = target.structured;
    applyHover(target.el);
  }

  function onClick(evt: MouseEvent) {
    // Let clicks inside the sidebar (host) pass through normally
    if (host.contains(evt.target as Node)) return;

    evt.preventDefault();
    evt.stopPropagation();
    const target = resolveTarget(evt, host);
    if (!target) return;

    console.debug("[klaxon canvas] click →", target.selector);
    clearHover();

    if (locked && target.selector !== selector) {
      console.debug("[klaxon canvas] click away → unlocking");
      clearSelection();
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
    applySelection(target.el);
  }

  function onScroll() {
    updatePositions();
  }

  function onResize() {
    updatePositions();
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

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
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      clearAll();
      destroyHighlight();
      removeStyles();
    },
  };
}
