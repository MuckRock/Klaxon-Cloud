// Klaxon page content script.
//
// Injected on demand into the active tab. It owns the on-page element picker
// (canvas.svelte.ts) — the dimming/hover/selection overlays and the aperture bar —
// inside a shadow root so page styles can't reach them. The sidebar UI itself
// lives in a native side panel (see src/sidepanel.ts); this script is purely the
// page-side half and talks to the panel over a `chrome.tabs` port,
// one port per connected panel.
import type { PanelMessage, Replies } from "./lib/canvas-client.svelte.ts";
import { initCanvas } from "./lib/canvas.svelte.ts";
import { loadFonts } from "./lib/fonts.ts";
import { getCanonicalTitle, getCanonicalURL } from "./lib/url.ts";
import { CANVAS_PORT } from "./lib/canvas-client.svelte.ts";

declare global {
  interface Window {
    _klaxonInject?: boolean;
  }
}

const HOST_ID = "klaxon-host";

(function () {
  // Re-injection (panel reconnects, tab revisited) just re-runs this IIFE; bail
  // if the canvas is already live so we don't double-mount overlays. The engine
  // and its locked selection persist for the tab's lifetime, so revisiting a tab
  // restores the previous selection.
  if (window._klaxonInject === true) return;
  window._klaxonInject = true;
  console.debug("[klaxon page booted]");

  const host = document.createElement("div");
  host.id = HOST_ID;
  // Ensure the host is visible even with `div:empty { display: none }`.
  host.style.display = "block";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Register Source Sans Pro on the page document so the shadow DOM overlays
  // (ApertureBar) can use it.
  loadFonts().catch((err) => console.debug("[klaxon fonts]", err));

  // No sidebar reserved on the page anymore — the native panel takes browser
  // chrome space and the page reflows on its own, so width is 0 here.
  const canvas = initCanvas(host, shadow, 0);

  // Each panel connection gets its own port. Stream canvas state to it and
  // accept actions back; when the panel closes or switches tabs the port
  // disconnects and we deactivate the overlays — but keep the locked selection
  // so it's restored when the panel reconnects to this tab.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== CANVAS_PORT) return;

    // A panel is (re)connected — restore the locked selection's overlay if one
    // survived a previous disconnect on this tab.
    canvas.visible = true;

    const stop = $effect.root(() => {
      $effect(() => {
        const s = canvas.state;
        try {
          port.postMessage({
            type: "state",
            selector: s.selector,
            matchText: s.matchText,
            locked: s.locked,
            // `structured` is a $state value, so Svelte hands back a Proxy.
            // Firefox's port messaging serializes with structured clone, which
            // throws DataCloneError on a Proxy and (because postMessage throws)
            // silently drops every state update — the panel never sees the
            // selection. Chrome serializes via JSON and tolerates the Proxy.
            // Snapshot to a plain object so the message clones in both browsers.
            structured: $state.snapshot(s.structured),
          });
        } catch {
          /* port closed mid-flush */
        }
      });
    });

    port.onMessage.addListener((msg: PanelMessage) => {
      switch (msg.type) {
        case "setActive":
          canvas.active = msg.active;
          break;
        case "setEditable":
          canvas.editable = msg.editable;
          break;
        case "clear":
          canvas.clearSelection();
          break;
        case "setSelector": {
          // document.querySelector throws on a malformed selector — report
          // validity separately so the panel can tell "invalid" from "no match".
          let found = false;
          let valid = true;
          try {
            const el = canvas.setSelector(msg.css);
            found = !!el;
            // Bring the matched region into view — the element lives here on
            // the page, so the scroll has to happen page-side (the panel only
            // learns whether it matched).
            el?.scrollIntoView({
              block: "start",
              behavior: "smooth",
              inline: "nearest",
            });
          } catch {
            valid = false;
          }
          const data: Replies["setSelector"] = { found, valid };
          port.postMessage({ type: "reply", id: msg.id, data });
          break;
        }
        case "getPage": {
          const data: Replies["getPage"] = {
            url: getCanonicalURL(),
            title: getCanonicalTitle(),
          };
          port.postMessage({ type: "reply", id: msg.id, data });
          break;
        }
      }
    });

    port.onDisconnect.addListener(() => {
      stop();
      // Drop interaction listeners and hide overlays, but DON'T clearSelection —
      // the locked selection must survive a tab switch / panel close so it's
      // restored when the panel reconnects to this tab.
      canvas.active = false;
      canvas.visible = false;
    });
  });
})();
