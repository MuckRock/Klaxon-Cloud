import Sidebar from "./Sidebar.svelte";
import { mount, unmount } from "svelte";
import { getCanonicalURL } from "./url";
import { initCanvas } from "../lib/canvas/index.svelte.ts";

declare global {
  interface Window {
    _klaxonInject?: boolean;
  }
}

const SIDEBAR_WIDTH = "300px";
const HOST_ID = "klaxon-host";

(function () {
  if (window._klaxonInject === true) {
    alert("The Klaxon bookmarklet is already active on this page.");
    return;
  }
  window._klaxonInject = true;
  console.debug("[klaxon booted]");

  // --- DOM scaffolding ---

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  const prevMarginRight = document.body.style.marginRight;
  document.body.style.marginRight = SIDEBAR_WIDTH;

  // --- Canvas & Svelte mount ---

  const canvas = initCanvas(host, shadow);

  const sidebar = mount(Sidebar, {
    target: mountPoint,
    props: {
      get selector() {
        return canvas.state.selector;
      },
      get matchText() {
        return canvas.state.matchText;
      },
      url: getCanonicalURL(),
      onClose: cleanup,
    },
  });

  // --- Teardown ---

  function cleanup() {
    canvas.destroy();
    document.body.style.marginRight = prevMarginRight;
    unmount(sidebar);
    host.remove();
    window._klaxonInject = false;
    console.debug("Closed Klaxon");
  }
})();
