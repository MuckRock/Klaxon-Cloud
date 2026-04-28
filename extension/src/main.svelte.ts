import { mount, unmount } from "svelte";
import App from "./lib/components/App.svelte";
import { restore } from "./lib/auth.svelte.ts";

declare global {
  interface Window {
    _klaxonInject?: boolean;
  }
}

const SIDEBAR_WIDTH = 300;
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
  document.body.style.marginRight = `${SIDEBAR_WIDTH}px`;

  // --- auth ---
  // Seed authState from whatever the SW has stored. Sidebar reacts when it
  // resolves.
  restore().catch((err) => console.debug("[klaxon auth/restore]", err));

  // --- Canvas & Svelte mount ---

  const app = mount(App, {
    target: mountPoint,
    props: {
      host,
      shadow,
      sidebarWidth: SIDEBAR_WIDTH,
      onclose: cleanup,
    },
  });

  // --- Teardown ---

  function cleanup() {
    document.body.style.marginRight = prevMarginRight;
    unmount(app);
    host.remove();
    window._klaxonInject = false;
    console.debug("Closed Klaxon");
  }
})();
