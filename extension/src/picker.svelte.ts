// Klaxon picker content script.
//
// Injected on demand into the active tab. Owns the on-page element picker
// (canvas.svelte.ts) — the dimming/hover/selection overlays and the aperture
// bar — inside a shadow root so page styles can't reach them. The sidebar UI
// itself now lives in a native side panel (see src/sidepanel.ts); this script
// is purely the page-side half and talks to the panel over a `chrome.tabs`
// port, with one port per connected panel.
import { initCanvas } from "./lib/canvas.svelte.ts";
import { getCanonicalURL } from "./lib/url.ts";
import { PICKER_PORT } from "./lib/pickerClient.svelte.ts";

declare global {
  interface Window {
    _klaxonInject?: boolean;
  }
}

const HOST_ID = "klaxon-host";

(function () {
  // Re-injection (panel reconnects, tab revisited) just re-runs this IIFE;
  // bail if the picker is already live so we don't double-mount overlays.
  if (window._klaxonInject === true) return;
  window._klaxonInject = true;
  console.debug("[klaxon picker booted]");

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // No sidebar reserved on the page anymore — the native panel takes browser
  // chrome space and the page reflows on its own, so width is 0 here.
  const canvas = initCanvas(host, shadow, 0);

  // Each panel connection gets its own port. Stream canvas state to it and
  // accept picker actions back; when the panel closes the port disconnects and
  // we drop the active picker so no overlays linger.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PICKER_PORT) return;

    const stop = $effect.root(() => {
      $effect(() => {
        const s = canvas.state;
        try {
          port.postMessage({
            type: "state",
            selector: s.selector,
            matchText: s.matchText,
            locked: s.locked,
            structured: s.structured,
          });
        } catch {
          /* port closed mid-flush */
        }
      });
    });

    port.onMessage.addListener(
      (msg: { type: string; [k: string]: unknown }) => {
        switch (msg.type) {
          case "setActive":
            canvas.active = msg.active as boolean;
            break;
          case "setEditable":
            canvas.editable = msg.editable as boolean;
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
              found = !!canvas.setSelector(msg.css as string);
            } catch {
              valid = false;
            }
            port.postMessage({
              type: "reply",
              id: msg.id,
              data: { found, valid },
            });
            break;
          }
          case "getPage":
            port.postMessage({
              type: "reply",
              id: msg.id,
              data: { url: getCanonicalURL() },
            });
            break;
        }
      },
    );

    port.onDisconnect.addListener(() => {
      stop();
      canvas.active = false;
      canvas.clearSelection();
    });
  });
})();
