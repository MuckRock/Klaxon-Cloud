import Sidebar from "./Sidebar.svelte";
import { mount, unmount } from "svelte";
import { getCanonicalURL } from "./url";
import { resolveTarget } from "./selector";

declare global {
  interface Window {
    _klaxonInject?: boolean;
  }
}

const HOVER_COLOR = "rgba(255, 11, 58, 0.3)";
const SAVED_COLOR = "rgba(58, 255, 11, 0.3)";
const SIDEBAR_WIDTH = "300px";
const HOST_ID = "klaxon-host";
const STYLE_ID = "klaxon-css-inject";

(function () {
  if (window._klaxonInject === true) {
    alert("The Klaxon bookmarklet is already active on this page.");
    return;
  }
  window._klaxonInject = true;
  console.log("[klaxon booted]");

  // --- DOM scaffolding ---

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  const prevMarginRight = document.body.style.marginRight;
  document.body.style.marginRight = SIDEBAR_WIDTH;

  const highlightStyles = document.createElement("style");
  highlightStyles.id = STYLE_ID;
  document.head.appendChild(highlightStyles);

  // --- Highlight styling ---

  let savedSelector = "";

  function updateHighlight(selector: string) {
    let css = selector + " { background-color: " + HOVER_COLOR + "; }\n";
    if (savedSelector) {
      css += savedSelector + " { background-color: " + SAVED_COLOR + "; }\n";
    }
    highlightStyles.innerHTML = css;
  }

  // --- Reactive state & Svelte mount ---

  let currentSelector = $state("");
  let currentMatchText = $state("");

  const sidebar = mount(Sidebar, {
    target: mountPoint,
    props: {
      get selector() {
        return currentSelector;
      },
      get matchText() {
        return currentMatchText;
      },
      url: getCanonicalURL(),
      onClose: cleanup,
    },
  });

  // --- Event handlers ---

  function onMouseMove(evt: MouseEvent) {
    if (!window._klaxonInject) return;
    const target = resolveTarget(evt, host);
    if (!target) return;
    currentSelector = target.selector;
    currentMatchText = target.matchText;
    updateHighlight(target.selector);
  }

  function onClick(evt: MouseEvent) {
    if (!window._klaxonInject) return;
    evt.preventDefault();
    const target = resolveTarget(evt, host);
    if (!target) return;
    savedSelector = target.selector;
    currentSelector = target.selector;
    currentMatchText = target.matchText;
    updateHighlight(target.selector);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);

  // --- Teardown ---

  function cleanup() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("click", onClick);
    document.body.style.marginRight = prevMarginRight;
    highlightStyles.remove();
    unmount(sidebar);
    host.remove();
    window._klaxonInject = false;
    console.log("Closed Klaxon");
  }
})();
