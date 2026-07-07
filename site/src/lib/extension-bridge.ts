// Client-side bridge to the Klaxon browser extension, used to detect whether
// it's installed so ExtensionGuidance can show the right instructions.
//
// The extension injects a content script (web-bridge.ts) on this origin that
// shares the page's `window`. We talk to it with origin-checked
// `window.postMessage` (see the protocol in extension/src/web-bridge.ts):
//   page  -> bridge: { source: "klaxon-web",       type: "klaxon/ping" }
//   bridge -> page:  { source: "klaxon-extension", type: "klaxon/hello" | "klaxon/pong" }
//
// The bridge announces itself with an unsolicited "klaxon/hello" on load, so we
// record any hello we see and treat it as proof of presence even before a ping.
import { browser } from "$app/environment";

const WEB_SOURCE = "klaxon-web";
const EXT_SOURCE = "klaxon-extension";

// Set once we've heard from the extension (hello or pong), so a later
// detectExtension() call can resolve synchronously without another round-trip.
let seenExtension = false;

if (browser) {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (
      data?.source === EXT_SOURCE &&
      (data.type === "klaxon/hello" || data.type === "klaxon/pong")
    ) {
      seenExtension = true;
    }
  });
}

/**
 * Test-only: clear the "seen the extension" cache so each case starts fresh.
 * Not used by app code — the cache is a load-time optimization (see above), and
 * browser-mode vitest can't reset module state via `vi.resetModules()`.
 */
export function _resetDetectionCache(): void {
  seenExtension = false;
}

/**
 * Detect whether the Klaxon extension is installed in this browser. Resolves
 * true immediately if we've already heard from it; otherwise pings and waits
 * for a pong, resolving false after `timeoutMs`.
 */
export function detectExtension(timeoutMs = 600): Promise<boolean> {
  if (!browser) return Promise.resolve(false);
  if (seenExtension) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (found: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(found);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (
        data?.source === EXT_SOURCE &&
        (data.type === "klaxon/hello" || data.type === "klaxon/pong")
      ) {
        seenExtension = true;
        finish(true);
      }
    };

    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => finish(false), timeoutMs);
    window.postMessage(
      { source: WEB_SOURCE, type: "klaxon/ping" },
      window.location.origin,
    );
  });
}

export type Browser = "chrome" | "firefox" | "safari" | "other";

/**
 * Best-effort UA sniff, used only to pick the right install call-to-action.
 * Detection itself (detectExtension) is UA-independent, so a wrong guess here
 * never blocks a user who actually has the extension. `ua` defaults to the real
 * user agent (empty during SSR → "other"); it's a parameter so it's testable.
 */
export function detectBrowser(
  ua: string = browser ? navigator.userAgent : "",
): Browser {
  if (/firefox\//i.test(ua)) return "firefox";
  if (/chrome\//i.test(ua)) return "chrome";
  if (/safari\//i.test(ua)) return "safari";
  return "other";
}

// Published extension store listings.
export const STORE_URLS = {
  chrome:
    "https://chromewebstore.google.com/detail/klaxon-cloud/dbdpgkmbnelddoackgmibkeomeppgbdn",
  firefox: "https://addons.mozilla.org/firefox/addon/klaxon-cloud/",
} as const;
