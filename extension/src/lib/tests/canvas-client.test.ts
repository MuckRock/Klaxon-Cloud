import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { CanvasClient, CANVAS_PORT } from "../canvas-client.svelte.ts";

// Unit tests for the panel-side CanvasClient: the page↔panel message protocol
// and the public, view-facing API (the `canvas`-shaped object the views consume
// via getCanvas), with `chrome.*` faked.
//
// e2e exercises the happy-path wiring against a real browser; these lock down
// the protocol's *failure* modes — a reply that never comes, a port that drops
// mid-request — which e2e can't readily induce, plus the tab-aware state
// (tracking vs. pinned, `away`) that needs more than one tab. We drive it the
// way a view does (public getters/setters); private fields are off-limits.

type Listener = (...args: any[]) => void;

/** A minimal chrome.events.Event stand-in with a test-side `emit`. */
function makeEvent() {
  const fns = new Set<Listener>();
  return {
    addListener: (f: Listener) => fns.add(f),
    removeListener: (f: Listener) => fns.delete(f),
    emit: (...args: any[]) => [...fns].forEach((f) => f(...args)),
    size: () => fns.size,
  };
}

/**
 * A fake chrome.runtime.Port. Records posted messages and, for any request
 * (a message carrying an `id`) whose `type` has a configured responder, replies
 * on a microtask — mirroring the page side. A type with no responder stays
 * silent, which is how we provoke timeout / disconnect-drain.
 */
class FakePort {
  name: string;
  onMessage = makeEvent();
  onDisconnect = makeEvent();
  posted: any[] = [];
  disconnected = false;
  #replies: Record<string, (msg: any) => unknown>;

  constructor(name: string, replies: Record<string, (msg: any) => unknown>) {
    this.name = name;
    this.#replies = replies;
  }

  postMessage(msg: any) {
    if (this.disconnected) throw new Error("port closed");
    this.posted.push(msg);
    const responder = this.#replies[msg.type];
    if (msg.id != null && responder) {
      const data = responder(msg);
      queueMicrotask(() =>
        this.onMessage.emit({ type: "reply", id: msg.id, data }),
      );
    }
  }

  // Chrome does NOT fire onDisconnect on the side that calls disconnect().
  disconnect() {
    this.disconnected = true;
  }

  /** Test helper: the page hung up (navigation/crash) — fires onDisconnect, as
   *  chrome does on the *other* side of a port that closed on its own. */
  hangup() {
    if (this.disconnected) return;
    this.disconnected = true;
    this.onDisconnect.emit();
  }

  types() {
    return this.posted.map((m) => m.type);
  }
}

function createChromeMock() {
  const tab = {
    id: 1,
    windowId: 10,
    url: "https://klaxon.test/",
    title: "Klaxon Test",
  };
  // What the page reports for `getPage` (canonical url/title) — kept separate
  // from the raw tab so navigateTab can change it on reconnect.
  const page = { url: "https://klaxon.test/", title: "Klaxon Test" };
  const ensure = { ok: true };
  const ports: FakePort[] = [];

  // Stable, mutable so tests can change one request's behaviour mid-flight and
  // every (existing and future) port sees it.
  const replies: Record<string, (msg: any) => unknown> = {
    getPage: () => ({ url: page.url, title: page.title }),
    setSelector: () => ({ found: true, valid: true }),
  };

  const onActivated = makeEvent();
  const onUpdated = makeEvent();

  const chrome = {
    tabs: {
      onActivated,
      onUpdated,
      query: vi.fn(async () => [tab]),
      get: vi.fn(async (id: number) => (id === tab.id ? tab : undefined)),
      update: vi.fn(async () => {}),
      connect: vi.fn((_tabId: number, info: { name: string }) => {
        const port = new FakePort(info.name, replies);
        ports.push(port);
        return port;
      }),
    },
    windows: { update: vi.fn(async () => {}) },
    runtime: {
      sendMessage: vi.fn(async (msg: any) =>
        msg?.type === "canvas/ensure" ? { ok: ensure.ok } : undefined,
      ),
      lastError: undefined as { message?: string } | undefined,
    },
  };

  return {
    chrome,
    tab,
    page,
    ensure,
    ports,
    onActivated,
    onUpdated,
    lastPort: () => ports[ports.length - 1],
    setReply: (type: string, fn: (msg: any) => unknown) => {
      replies[type] = fn;
    },
    removeReply: (type: string) => {
      delete replies[type];
    },
  };
}

/** Let the (real-timer) connect chain and its microtask replies settle. */
function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

let mock: ReturnType<typeof createChromeMock>;

beforeEach(() => {
  mock = createChromeMock();
  vi.stubGlobal("chrome", mock.chrome);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("connect / tab mirroring", () => {
  it("connects to the active tab and mirrors its origin, url, and title", async () => {
    const client = new CanvasClient();
    await flush();

    expect(client.watchable).toBe(true);
    expect(client.origin).toBe("https://klaxon.test");
    expect(client.url).toBe("https://klaxon.test/");
    expect(client.title).toBe("Klaxon Test");

    // Opened the named port and replayed panel intent onto the fresh engine.
    const port = mock.lastPort();
    expect(port.name).toBe(CANVAS_PORT);
    expect(port.types()).toEqual(
      expect.arrayContaining(["getPage", "setActive", "setEditable"]),
    );

    client.destroy();
  });

  it("stays unwatchable and never injects/connects on a restricted page", async () => {
    mock.tab.url = "chrome://extensions/";
    const client = new CanvasClient();
    await flush();

    expect(client.watchable).toBe(false);
    expect(mock.ports).toHaveLength(0);
    expect(mock.chrome.runtime.sendMessage).not.toHaveBeenCalled();

    client.destroy();
  });

  it("reconnects to the new page on a tab switch, tearing down the old port", async () => {
    const client = new CanvasClient();
    await flush();
    const first = mock.lastPort();

    mock.onActivated.emit({ tabId: 1 });
    await flush();

    expect(first.disconnected).toBe(true);
    expect(mock.ports).toHaveLength(2);
    expect(client.watchable).toBe(true);

    client.destroy();
  });
});

describe("setSelector request/reply", () => {
  it("resolves true when an element matched and false when none did", async () => {
    const client = new CanvasClient();
    await flush();

    await expect(client.setSelector("p#hit")).resolves.toBe(true);

    mock.setReply("setSelector", () => ({ found: false, valid: true }));
    await expect(client.setSelector("p#miss")).resolves.toBe(false);

    client.destroy();
  });

  it("throws on a malformed selector (valid: false)", async () => {
    const client = new CanvasClient();
    await flush();

    mock.setReply("setSelector", () => ({ found: false, valid: false }));
    await expect(client.setSelector("::nonsense")).rejects.toThrow(
      "Invalid CSS selector",
    );

    client.destroy();
  });
});

describe("resilience: a request never wedges the caller", () => {
  it("resolves (degraded) when the page never replies, via the timeout", async () => {
    vi.useFakeTimers();
    const client = new CanvasClient();
    // Settle the connect chain (query/ensure awaits + the getPage microtask reply).
    await vi.advanceTimersByTimeAsync(1);
    expect(client.watchable).toBe(true);

    // The page stops answering setSelector.
    mock.removeReply("setSelector");
    const pending = client.setSelector(".x");

    let settled = false;
    void pending.then(() => (settled = true));

    // Before the deadline the request is genuinely outstanding...
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    // ...and the timeout backstop resolves it rather than hanging forever.
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBe(false);

    client.destroy();
  });

  it("drains in-flight requests when the port disconnects on its own", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const client = new CanvasClient();
    await flush();

    mock.removeReply("setSelector");
    const port = mock.lastPort();
    const pending = client.setSelector(".x");

    // The document is replaced / the tab crashes with the request in flight.
    port.hangup();

    await expect(pending).resolves.toBe(false);
    expect(debug).toHaveBeenCalledWith(
      "[klaxon] canvas port disconnected",
      expect.any(String),
    );

    client.destroy();
    debug.mockRestore();
  });
});

describe("pinned / away (multi-tab affordance)", () => {
  it("reports `away` when pinned to a tab other than the active one", async () => {
    const client = new CanvasClient();
    await flush();
    expect(client.away).toBe(false);

    // Entering a selection flow pins the canvas to the current tab.
    client.pinned = true;
    expect(client.pinnedTitle).toBe("Klaxon Test");

    // Switching tabs while pinned must NOT chase the new tab (no reconnect)...
    const portCount = mock.ports.length;
    mock.onActivated.emit({ tabId: 2 });
    await flush();
    expect(client.away).toBe(true);
    expect(mock.ports).toHaveLength(portCount);

    // ...and returning to the pinned tab clears the affordance.
    mock.onActivated.emit({ tabId: 1 });
    await flush();
    expect(client.away).toBe(false);

    client.destroy();
  });

  it("focusPinnedTab activates the pinned tab and focuses its window", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true;

    client.focusPinnedTab();

    expect(mock.chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    expect(mock.chrome.windows.update).toHaveBeenCalledWith(10, {
      focused: true,
    });

    client.destroy();
  });
});

describe("navigateTab (drive the tab to an alert's page, issue #71)", () => {
  it("navigates the pinned tab and reconnects once it finishes loading", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true; // selection flows pin on entry
    const portsBefore = mock.ports.length;

    // The alert lives on a different page than the one we opened from.
    mock.tab.url = "https://other.test/";
    mock.page.url = "https://other.test/";

    const nav = client.navigateTab("https://other.test/");
    await flush(); // executor has attached its onUpdated listener + called update
    mock.onUpdated.emit(1, { status: "complete" }, mock.tab);
    await nav;

    expect(mock.chrome.tabs.update).toHaveBeenCalledWith(1, {
      url: "https://other.test/",
    });
    expect(mock.ports.length).toBeGreaterThan(portsBefore);
    expect(client.url).toBe("https://other.test/");
    expect(client.watchable).toBe(true);

    client.destroy();
  });

  it("is a no-op when the tab is already showing the target url", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true;
    mock.chrome.tabs.update.mockClear();

    await client.navigateTab("https://klaxon.test/");

    expect(mock.chrome.tabs.update).not.toHaveBeenCalled();

    client.destroy();
  });
});
