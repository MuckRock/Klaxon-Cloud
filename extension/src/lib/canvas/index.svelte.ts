import { resolveTarget } from "../../content/selector";
import {
  applyHover,
  applySelection,
  clearAll,
  clearHover,
  clearSelection,
} from "./highlight";
import { injectStyles, removeStyles } from "./styles";

export interface CanvasState {
  readonly mouse: { x: number; y: number };
  readonly selector: string;
  readonly matchText: string;
  readonly locked: boolean;
}

export interface Canvas {
  readonly state: CanvasState;
  destroy(): void;
}

export function initCanvas(host: HTMLElement): Canvas {
  let mouse = $state({ x: 0, y: 0 });
  let selector = $state("");
  let matchText = $state("");
  let locked = $state(false);

  injectStyles();
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

    const el = document.querySelector(target.selector);
    if (el) applyHover(el);
  }

  function onClick(evt: MouseEvent) {
    evt.preventDefault();
    const target = resolveTarget(evt, host);
    if (!target) return;

    console.debug("[klaxon canvas] click →", target.selector);
    clearHover();

    if (locked && target.selector !== selector) {
      console.debug("[klaxon canvas] click away → unlocking");
      clearSelection();
      selector = "";
      matchText = "";
      locked = false;
      return;
    }

    selector = target.selector;
    matchText = target.matchText;
    locked = true;

    const el = document.querySelector(target.selector);
    if (el) applySelection(el);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);

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
      };
    },
    destroy() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      clearAll();
      removeStyles();
    },
  };
}
