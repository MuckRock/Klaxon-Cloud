// Klaxon Cloud web-bridge content script.
//
// Declared (in the per-browser manifest) to run only on the companion web app's
// origin — the match pattern is injected at build time from MUCKROCK_WEB_ORIGIN
// (see scripts/manifest.mjs / vite/page.config.ts). It is the only channel the
// web page has to the extension: content scripts run in an isolated world but
// share the page's `window`, so we bridge via origin-checked `window.postMessage`.
//
// Its sole job is presence detection so the web app can show the right
// instructions. Protocol (all messages carry a `source` discriminator so they
// don't collide with unrelated postMessage traffic on the page):
//   page  -> bridge: { source: "klaxon-web",       type: "klaxon/ping" }
//   bridge -> page:  { source: "klaxon-extension", type: "klaxon/hello" | "klaxon/pong", version }
//
// We announce presence with an unsolicited `klaxon/hello` on load *and* answer
// `klaxon/ping` with `klaxon/pong`, so detection is robust to load-order races
// in either direction.
const WEB_SOURCE = "klaxon-web";
const EXT_SOURCE = "klaxon-extension";

const version = chrome.runtime.getManifest().version;

function announce(type: "klaxon/hello" | "klaxon/pong"): void {
  window.postMessage({ source: EXT_SOURCE, type, version }, window.location.origin);
}

window.addEventListener("message", (event: MessageEvent) => {
  // Only trust same-window, same-origin messages from the web app.
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  const data = event.data;
  if (!data || data.source !== WEB_SOURCE || typeof data.type !== "string") {
    return;
  }

  if (data.type === "klaxon/ping") announce("klaxon/pong");
});

// Announce presence as soon as the bridge loads, in case the page is already
// listening before it sends a ping.
announce("klaxon/hello");
