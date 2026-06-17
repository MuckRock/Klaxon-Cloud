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

// Seed auth from whatever the service worker has stored.
restore().catch((err) => console.debug("[klaxon auth/restore]", err));

// Register Source Sans Pro on the panel document.
loadFonts().catch((err) => console.debug("[klaxon fonts]", err));

const canvas = initCanvasClient();

mount(App, {
  target: document.getElementById("app")!,
  props: { canvas },
});
