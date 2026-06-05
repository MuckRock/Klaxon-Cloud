// Side-panel entry point.
//
// The native browser side panel (Chrome `sidePanel` / Firefox `sidebarAction`)
// loads this page as an extension document. Unlike the old content-script
// sidebar, it persists across page navigations and has full `chrome.*` access.
// It hosts the same <App> as before; the on-page element picker is a separate
// content script reached through the PickerClient.
import { mount } from "svelte";
import App from "./lib/components/App.svelte";
import { restore } from "./lib/auth.svelte.ts";
import { initPickerClient } from "./lib/pickerClient.svelte.ts";

// Seed auth from whatever the service worker has stored.
restore().catch((err) => console.debug("[klaxon auth/restore]", err));

const canvas = initPickerClient();

mount(App, {
  target: document.getElementById("app")!,
  props: { canvas },
});
