import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { CanvasClient, CANVAS_PORT } from "../canvas-client.svelte.ts";
import { mountEffect } from "./effect-harness.svelte.ts";

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
  // Whether chrome.permissions.request/contains report the host as granted.
  const grant = { ok: true };
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
      // Driving a tab to a url moves it there, so model that: navigateTab's
      // "already there?" guard reads the tab's live url, and an inert update
      // would leave the fake tab lying about where it is.
      update: vi.fn(async (_id: number, props: { url?: string }) => {
        if (props?.url) tab.url = props.url;
      }),
      connect: vi.fn((_tabId: number, info: { name: string }) => {
        const port = new FakePort(info.name, replies);
        ports.push(port);
        return port;
      }),
    },
    windows: { update: vi.fn(async () => {}) },
    permissions: {
      request: vi.fn(async () => grant.ok),
      contains: vi.fn(async () => grant.ok),
    },
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
    grant,
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

/**
 * A client in an injected/connected state: tracking no longer opens a port, so
 * tests that exercise the port pin the canvas (as a selection flow does) to
 * trigger the on-demand inject + connect.
 */
async function pinnedClient() {
  const client = new CanvasClient();
  await flush();
  client.pinned = true;
  await flush();
  return client;
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
  it("mirrors the active tab's origin and url and is watchable, without injecting", async () => {
    const client = new CanvasClient();
    await flush();

    // Tracking mode reads the tab via `tabs` but does not inject the picker —
    // no on-page access until the user explicitly starts a flow.
    expect(client.watchable).toBe(true);
    expect(client.origin).toBe("https://klaxon.test");
    expect(client.url).toBe("https://klaxon.test/");
    expect(mock.ports).toHaveLength(0);
    expect(mock.chrome.runtime.sendMessage).not.toHaveBeenCalled();

    client.destroy();
  });

  it("injects and opens the port when a selection flow pins the tab", async () => {
    const client = new CanvasClient();
    await flush();
    expect(mock.ports).toHaveLength(0);

    client.pinned = true; // entering a selection flow
    await flush();

    expect(mock.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "canvas/ensure" }),
    );
    const port = mock.lastPort();
    expect(port.name).toBe(CANVAS_PORT);
    // Replayed panel intent and resolved the canonical title onto the engine.
    expect(port.types()).toEqual(
      expect.arrayContaining(["getPage", "setActive", "setEditable"]),
    );
    expect(client.title).toBe("Klaxon Test");

    client.destroy();
  });

  it("stays unwatchable and never injects on a restricted page", async () => {
    mock.tab.url = "chrome://extensions/";
    const client = new CanvasClient();
    await flush();

    expect(client.watchable).toBe(false);
    expect(mock.ports).toHaveLength(0);
    expect(mock.chrome.runtime.sendMessage).not.toHaveBeenCalled();

    client.destroy();
  });

  it("re-mirrors the new page on a tab switch (tracking) without opening a port", async () => {
    const client = new CanvasClient();
    await flush();

    mock.tab.url = "https://other.test/page";
    mock.onActivated.emit({ tabId: 1 });
    await flush();

    expect(client.origin).toBe("https://other.test");
    expect(client.url).toBe("https://other.test/page");
    expect(client.watchable).toBe(true);
    expect(mock.ports).toHaveLength(0);

    client.destroy();
  });
});

describe("requestWatch (per-origin host gate)", () => {
  it("requests host access for the active tab's origin and returns the grant", async () => {
    const client = new CanvasClient();
    await flush();

    await expect(client.requestWatch()).resolves.toBe(true);
    expect(mock.chrome.permissions.request).toHaveBeenCalledWith({
      origins: ["https://klaxon.test/*"],
    });

    client.destroy();
  });

  it("resolves false when the user declines the prompt", async () => {
    const client = new CanvasClient();
    await flush();
    mock.grant.ok = false;

    await expect(client.requestWatch()).resolves.toBe(false);

    client.destroy();
  });

  it("requests the explicit origin when one is passed", async () => {
    const client = new CanvasClient();
    await flush();

    await client.requestWatch("https://other.test");
    expect(mock.chrome.permissions.request).toHaveBeenCalledWith({
      origins: ["https://other.test/*"],
    });

    client.destroy();
  });
});

describe("setSelector request/reply", () => {
  it("resolves true when an element matched and false when none did", async () => {
    const client = await pinnedClient();

    await expect(client.setSelector("p#hit")).resolves.toBe(true);

    mock.setReply("setSelector", () => ({ found: false, valid: true }));
    await expect(client.setSelector("p#miss")).resolves.toBe(false);

    client.destroy();
  });

  it("throws on a malformed selector (valid: false)", async () => {
    const client = await pinnedClient();

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
    await vi.advanceTimersByTimeAsync(1);
    expect(client.watchable).toBe(true);

    // A selection flow pins + injects, opening the port (settle its getPage).
    client.pinned = true;
    await vi.advanceTimersByTimeAsync(1);

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
    const client = await pinnedClient();

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

    // Entering a selection flow pins the canvas to the current tab and injects.
    client.pinned = true;
    await flush();
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
  it("navigates the pinned tab and reconnects once its load completes", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true; // selection flows pin on entry
    await flush();
    const portsBefore = mock.ports.length;

    // The alert lives on a different page than the one we opened from.
    mock.page.url = "https://other.test/";

    const nav = client.navigateTab("https://other.test/");
    await flush(); // executor has attached its onUpdated listener + called update
    mock.onUpdated.emit(1, { status: "loading" }, mock.tab);
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

  it("ignores a stale `complete` that precedes our navigation's load", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true;
    await flush();
    mock.page.url = "https://other.test/";

    const nav = client.navigateTab("https://other.test/");
    let done = false;
    void nav.then(() => (done = true));
    await flush();

    // A `complete` left over from the previous document — before our load
    // begins — must NOT resolve the wait (that would reconnect to the old page).
    mock.onUpdated.emit(1, { status: "complete" }, mock.tab);
    await flush();
    expect(done).toBe(false);

    // Our navigation's real load cycle (loading → complete) resolves it.
    mock.onUpdated.emit(1, { status: "loading" }, mock.tab);
    mock.onUpdated.emit(1, { status: "complete" }, mock.tab);
    await nav;
    expect(done).toBe(true);

    client.destroy();
  });

  it("resolves via the timeout when the load never completes", async () => {
    vi.useFakeTimers();
    const client = new CanvasClient();
    await vi.advanceTimersByTimeAsync(1);
    client.pinned = true;
    await vi.advanceTimersByTimeAsync(1);
    const portsBefore = mock.ports.length;
    mock.page.url = "https://slow.test/";

    const nav = client.navigateTab("https://slow.test/");
    let done = false;
    void nav.then(() => (done = true));

    // No load events arrive...
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);

    // ...so the backstop fires and the client reconnects against the tab anyway.
    await vi.advanceTimersByTimeAsync(15000);
    await nav;
    expect(done).toBe(true);
    expect(mock.ports.length).toBeGreaterThan(portsBefore);
    expect(client.url).toBe("https://slow.test/");

    client.destroy();
  });

  it("refreshes the pinned tab's title after navigating it", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true;
    await flush();
    expect(client.pinnedTitle).toBe("Klaxon Test");

    // The pinned tab is driven to the alert's page; its title changes with the
    // new document.
    mock.tab.title = "Other Page";
    mock.page.url = "https://other.test/";

    const nav = client.navigateTab("https://other.test/");
    await flush();
    mock.onUpdated.emit(1, { status: "loading" }, mock.tab);
    mock.onUpdated.emit(1, { status: "complete" }, mock.tab);
    await nav;

    expect(client.pinnedTitle).toBe("Other Page");

    client.destroy();
  });

  it("is a no-op when the tab is already showing the target url", async () => {
    const client = new CanvasClient();
    await flush();
    client.pinned = true;
    await flush();
    mock.chrome.tabs.update.mockClear();

    await client.navigateTab("https://klaxon.test/");

    expect(mock.chrome.tabs.update).not.toHaveBeenCalled();

    client.destroy();
  });
});

describe("navigateTab url normalization", () => {
  /** A connected client whose mirrored url is `url`. */
  async function clientAt(url: string) {
    mock.tab.url = url;
    mock.page.url = url;
    const client = new CanvasClient();
    await flush();
    expect(client.url).toBe(url); // sanity: connected and mirrored
    mock.chrome.tabs.update.mockClear();
    return client;
  }

  it("does not re-navigate for a trailing-slash-only difference", async () => {
    const client = await clientAt("https://klaxon.test/article");
    await client.navigateTab("https://klaxon.test/article/");
    expect(mock.chrome.tabs.update).not.toHaveBeenCalled();
    client.destroy();
  });

  it("does not re-navigate for a fragment-only difference", async () => {
    const client = await clientAt("https://klaxon.test/article");
    await client.navigateTab("https://klaxon.test/article#section");
    expect(mock.chrome.tabs.update).not.toHaveBeenCalled();
    client.destroy();
  });

  it("does navigate when the query string differs (a different page)", async () => {
    const client = await clientAt("https://klaxon.test/article");
    const nav = client.navigateTab("https://klaxon.test/article?page=2");
    await flush();
    mock.onUpdated.emit(1, { status: "loading" }, mock.tab);
    mock.onUpdated.emit(1, { status: "complete" }, mock.tab);
    await nav;
    expect(mock.chrome.tabs.update).toHaveBeenCalledWith(1, {
      url: "https://klaxon.test/article?page=2",
    });
    client.destroy();
  });
});

describe("navigateTab does not loop on a misreported canonical (issue #94)", () => {
  // What Socrata serves on the page in the issue: a canonical that is *relative*
  // and names a *different* document than the one being viewed.
  const SITE = "https://data.test/dataset/explore/query/SELECT%20x/page/filter";
  const CLAIMED_CANONICAL = "/dataset/data";

  /** A pinned client on a page that misreports its canonical, as a view finds it. */
  async function pinnedOnLyingPage() {
    mock.page.url = CLAIMED_CANONICAL;
    const client = new CanvasClient();
    await flush();
    client.pinned = true;
    await flush();
    mock.chrome.tabs.update.mockClear();
    return client;
  }

  /** Let a driven navigation (and anything it provokes) run to completion. */
  async function settleNavigation() {
    await flush();
    mock.onUpdated.emit(1, { status: "loading" }, mock.tab);
    mock.onUpdated.emit(1, { status: "complete" }, mock.tab);
    await flush();
  }

  it("guards on the tab's real url, not the canonical the page reports", async () => {
    const client = await pinnedOnLyingPage();

    const nav = client.navigateTab(SITE);
    await settleNavigation();
    await nav;

    // The page still claims a canonical that matches neither the tab nor `site`,
    // so a guard trusting `client.url` would navigate again here.
    expect(client.url).toBe(CLAIMED_CANONICAL);
    await client.navigateTab(SITE);
    expect(mock.chrome.tabs.update).toHaveBeenCalledTimes(1);

    client.destroy();
  });

  it("drives the tab only once from a mounted effect", async () => {
    const client = await pinnedOnLyingPage();

    // ViewAlert's effect, verbatim (ViewAlert.svelte / EditAlert.svelte): the
    // async IIFE means navigateTab's prologue runs inside the tracking context,
    // so any reactive read there subscribes *this* effect to state the
    // navigation itself writes — and it re-runs and re-navigates, forever.
    const stop = mountEffect(() => {
      void (async () => {
        await client.navigateTab(SITE);
        void client.setSelector(".target");
      })();
      return () => {
        client.clearSelection();
      };
    });

    // Bounded, so a regression fails the assertion instead of hanging the runner.
    for (let i = 0; i < 5; i++) await settleNavigation();

    expect(mock.chrome.tabs.update).toHaveBeenCalledTimes(1);
    expect(mock.chrome.tabs.update).toHaveBeenCalledWith(1, { url: SITE });

    stop();
    client.destroy();
  });

  it("refuses to drive the tab to a relative stored site", async () => {
    const client = await pinnedOnLyingPage();

    // An alert saved before the canonical was absolutized: `site` is a bare path,
    // which chrome would resolve against the extension's own origin.
    await client.navigateTab(CLAIMED_CANONICAL);

    expect(mock.chrome.tabs.update).not.toHaveBeenCalled();
    expect(client.watchable).toBe(true); // port left intact

    client.destroy();
  });

  it("ignores a second call while one navigation is still in flight", async () => {
    const client = await pinnedOnLyingPage();

    const first = client.navigateTab(SITE);
    const second = client.navigateTab(SITE);
    await settleNavigation();
    await Promise.all([first, second]);

    expect(mock.chrome.tabs.update).toHaveBeenCalledTimes(1);

    client.destroy();
  });
});

describe("wire protocol", () => {
  it("posts one-way actions (active/editable/clear) over the port", async () => {
    const client = await pinnedClient();
    const port = mock.lastPort();
    port.posted.length = 0; // drop the connect handshake

    client.active = true;
    client.editable = false;
    client.clearSelection();

    expect(port.posted).toEqual([
      { type: "setActive", active: true },
      { type: "setEditable", editable: false },
      { type: "clear" },
    ]);

    client.destroy();
  });

  it("mirrors streamed engine `state` messages into `state`", async () => {
    const client = await pinnedClient();

    mock.lastPort().onMessage.emit({
      type: "state",
      selector: "p#x",
      matchText: "hello",
      locked: true,
      structured: undefined,
    });

    expect(client.state).toEqual({
      selector: "p#x",
      matchText: "hello",
      locked: true,
      structured: undefined,
    });

    client.destroy();
  });
});
