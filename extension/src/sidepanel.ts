// Side-panel entry point.
//
// The native browser side panel (Chrome `sidePanel` / Firefox `sidebarAction`)
// loads this page as an extension document. Unlike the old content-script
// sidebar, it persists across page navigations and has full `chrome.*` access.
// It hosts the same <App> as before; the on-page element picker is a separate
// content script reached through the CanvasClient.
import { mount } from "svelte";

import App from "./lib/components/App.svelte";
import { restore } from "./lib/auth.svelte.ts";
import { loadFonts } from "./lib/fonts.ts";
import { initCanvasClient } from "./lib/canvas-client.svelte.ts";

// #91: detect an invisible side-panel context and fall back to a popup window.
// Some Chromium browsers (Arc) silently resolve the side panels API without handling.
// A real side panel lays out to a non-zero size within a few hundred ms of opening;
// the phantom stays 0×0 forever. If we never get a real size, ask the service worker
// to open a standalone popup window instead. The service worker opens that window
// as `?fallback=1`, which skips this check (a real popup window would otherwise loop).
//
// Chrome-only. `__FIREFOX__` is a build-time constant (see vite/sidepanel.config.ts)
// so the Firefox bundle ships none of this, rather than carrying an inert timer.
declare const __FIREFOX__: boolean;

if (!__FIREFOX__) {
  const watchForPhantomPanel = () => {
    const DEADLINE_MS = 1500;
    const started = Date.now();
    const rendered = () =>
      document.documentElement.clientWidth > 0 || window.innerWidth > 0;
    const check = () => {
      if (rendered()) return; // real, visible panel — nothing to do
      if (Date.now() - started >= DEADLINE_MS) {
        void chrome.runtime
          .sendMessage({ type: "panel/fallback" })
          .catch(() => {});
        return;
      }
      setTimeout(check, 100);
    };
    setTimeout(check, 100);
  };

  // Only probe for the invisible-phantom panel when we ARE the (attempted) side
  // panel; the popup-window fallback (?fallback=1) is already a real, sized surface.
  if (new URLSearchParams(location.search).get("fallback") !== "1") {
    watchForPhantomPanel();
  }
}

// Seed auth from whatever the service worker has stored.
restore().catch((err) => console.debug("[klaxon auth/restore]", err));

// Register Source Sans Pro on the panel document.
loadFonts().catch((err) => console.debug("[klaxon fonts]", err));

const canvas = initCanvasClient();

mount(App, {
  target: document.getElementById("app")!,
  props: { canvas },
});
