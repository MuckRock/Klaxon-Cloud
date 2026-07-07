// Runs in the browser project (real window + postMessage) — see vite.config.ts.
// detectExtension() is a genuine round-trip over window.postMessage, so it needs
// a real window; the pure helpers (detectBrowser, STORE_URLS) ride along.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetDetectionCache,
  detectBrowser,
  detectExtension,
  STORE_URLS,
} from "./extension-bridge";

const WEB_SOURCE = "klaxon-web";
const EXT_SOURCE = "klaxon-extension";

describe("detectBrowser", () => {
  it("detects Firefox", () => {
    expect(
      detectBrowser(
        "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
      ),
    ).toBe("firefox");
  });

  it("detects Chrome (and other Chromium browsers)", () => {
    expect(
      detectBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("chrome");
  });

  it("detects Safari (Chrome-less WebKit)", () => {
    expect(
      detectBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
    ).toBe("safari");
  });

  it("falls back to other for an unrecognized UA", () => {
    expect(detectBrowser("")).toBe("other");
    expect(detectBrowser("some-bot/1.0")).toBe("other");
  });
});

describe("STORE_URLS", () => {
  it("points at the official Chrome and Firefox stores", () => {
    expect(STORE_URLS.chrome).toContain("chromewebstore.google.com");
    expect(STORE_URLS.firefox).toContain("addons.mozilla.org");
  });
});

describe("detectExtension", () => {
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    _resetDetectionCache();
  });

  afterEach(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    _resetDetectionCache();
  });

  // Stand in for the extension's content script: reply to a ping (or stay
  // silent). Registered on window and torn down after each test.
  function fakeExtension(
    reply: "klaxon/pong" | "klaxon/hello",
    { source = EXT_SOURCE }: { source?: string } = {},
  ) {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data?.source === WEB_SOURCE && data.type === "klaxon/ping") {
        window.postMessage({ source, type: reply }, window.location.origin);
      }
    };
    window.addEventListener("message", handler);
    cleanups.push(() => window.removeEventListener("message", handler));
  }

  it("resolves true when the extension answers a ping with pong", async () => {
    fakeExtension("klaxon/pong");
    await expect(detectExtension(500)).resolves.toBe(true);
  });

  it("resolves true on an unsolicited hello too", async () => {
    fakeExtension("klaxon/hello");
    await expect(detectExtension(500)).resolves.toBe(true);
  });

  it("resolves false when nothing responds before the timeout", async () => {
    await expect(detectExtension(100)).resolves.toBe(false);
  });

  it("ignores replies from an unknown source", async () => {
    fakeExtension("klaxon/pong", { source: "not-klaxon" });
    await expect(detectExtension(100)).resolves.toBe(false);
  });

  it("short-circuits to true when a hello was already seen before the call", async () => {
    // The extension announces itself on load, before any detect call runs; the
    // module-level listener records it.
    window.postMessage(
      { source: EXT_SOURCE, type: "klaxon/hello" },
      window.location.origin,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    // A zero-timeout detect should still resolve true without a round-trip.
    await expect(detectExtension(0)).resolves.toBe(true);
  });
});
