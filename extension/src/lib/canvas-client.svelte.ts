// Panel-side proxy for the on-page Canvas.
// =====
// The sidebar UI lives in a browser-native side panel (an extension page),
// while the element picker (canvas.svelte.ts) stays a content script with
// direct page-DOM access. This module is the bridge: it mirrors the engine's
// state into reactive `$state` and proxies actions to it over a long-lived
// `chrome.tabs` port, so the views keep talking to a `canvas`-shaped object via
// the getCanvas/setCanvas context exactly as before (only `setSelector` becomes
// async).
//
// Two modes:
//   - Tracking (default, on the alert list): follow the active tab so `origin` /
//     `watchable` reflect the page you're looking at. Switching tabs (or a
//     top-level navigation completing) reconnects to the new page.
//   - Pinned (during a selection flow — see `pinned`): lock onto the tab that was
//     active when the flow began and stop following tab switches. The port to
//     that page stays open, so its overlay simply stays where it was injected —
//     you don't see it while looking at another tab, and it's there when you
//     switch back. The panel keeps showing the same view throughout.
// =====

import type { StructuredSelector } from "./selector.ts";
import { createContext } from "svelte";

export const CANVAS_PORT = "klaxon-canvas";

/** How long to wait for a page reply before giving up (ms). Local IPC is
 *  near-instant; this only fires when the page never answers (handler threw
 *  before postMessage, the message was lost, the page is wedged). */
const REQUEST_TIMEOUT_MS = 5000;

/** State streamed from the engine to the panel (a subset of CanvasState). */
export interface CanvasMirror {
  readonly selector: string;
  readonly matchText: string;
  readonly locked: boolean;
  readonly structured?: StructuredSelector;
}

const EMPTY_MIRROR: CanvasMirror = {
  selector: "",
  matchText: "",
  locked: false,
  structured: undefined,
};

/** Page→panel messages over the port. */
type InboundMessage =
  | ({ type: "state" } & CanvasMirror)
  | { type: "reply"; id: number; data: unknown };

/** We can only inject the canvas into ordinary web origins. */
function injectable(url: string | undefined): url is string {
  return !!url && /^https?:\/\//.test(url);
}

function originOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/** Enough of a tab to identify, label, and re-focus it. */
interface TabRef {
  id: number;
  windowId: number;
  title: string;
}

/** An in-flight #request awaiting its reply (or a timeout). */
interface PendingRequest {
  resolve: (data: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class CanvasClient {
  // Mirror of the engine's reactive state, fed by `state` port messages.
  #mirror = $state<CanvasMirror>({ ...EMPTY_MIRROR });

  /** Canonical URL of the inspected page (raw tab URL on restricted pages). */
  url = $state("");
  /** Origin of the active tab — the alert list's `domain` filter. */
  origin = $state("");
  /** Canonical title of the inspected page (SaveAlert's default title). */
  title = $state("");
  /** True only once the canvas is injected and connected — false on chrome://,
   *  the web store, PDFs, file://, or any injection failure. */
  watchable = $state(false);

  // Panel-side intent, replayed onto the (re)connected engine.
  #active = false;
  #editable = true;
  // While pinned, ignore tab switches and keep the port to the pinned tab (see
  // the class header). Tracking (false) follows the active tab.
  #pinned = false;
  // The tab the port is currently connected to, captured from the active-tab
  // query in #connect; pinning snapshots it into #pinnedTab.
  #connectedTab: TabRef | null = null;
  // The pinned tab's ref (id/window/title), reactive so `away`/`pinnedTitle`
  // recompute. Best-effort: may be null even while pinned (e.g. nothing was
  // connected), in which case there's just no "jump back" affordance.
  #pinnedTab = $state<TabRef | null>(null);
  // The currently active tab, tracked even while pinned so the views can tell
  // the user when they've navigated away from the pinned page.
  #activeTabId = $state<number | null>(null);

  #port: chrome.runtime.Port | null = null;
  // Bumped on every #connect so overlapping connects (rapid tab switches) can
  // detect they've been superseded and bail instead of leaking a port.
  #connectSeq = 0;

  // Pending request/response calls keyed by an incrementing id (setSelector,
  // getPage). One-way actions (setActive/setEditable/clear) skip this.
  #reqId = 0;
  #pending = new Map<number, PendingRequest>();

  constructor() {
    chrome.tabs.onActivated.addListener(this.#rebind);
    chrome.tabs.onUpdated.addListener(this.#onTabUpdated);
    void this.#connect();
  }

  // ── view-facing API (mirrors the content-script Canvas shape) ─────────────

  get state(): CanvasMirror {
    return this.#mirror;
  }

  get active() {
    return this.#active;
  }
  set active(v: boolean) {
    this.#active = v;
    this.#post({ type: "setActive", active: v });
  }

  get editable() {
    return this.#editable;
  }
  set editable(v: boolean) {
    this.#editable = v;
    this.#post({ type: "setEditable", editable: v });
  }

  /**
   * Pin the canvas to the current page for the duration of a selection flow.
   * While pinned, tab switches are ignored — the port (and its overlay) stay on
   * the pinned tab. Unpinning resumes tracking and re-syncs to the active tab.
   */
  get pinned() {
    return this.#pinned;
  }
  set pinned(v: boolean) {
    if (v === this.#pinned) return;
    this.#pinned = v;
    // Snapshot the connected tab so the views can label/return to it; clear on
    // unpin and resume tracking the active tab.
    this.#pinnedTab = v ? this.#connectedTab : null;
    if (!v) void this.#connect();
  }

  /** True when pinned to a tab other than the one currently being viewed. */
  get away(): boolean {
    return (
      this.#pinnedTab !== null &&
      this.#activeTabId !== null &&
      this.#activeTabId !== this.#pinnedTab.id
    );
  }

  /** Title of the pinned tab, for labelling the "jump back" affordance. */
  get pinnedTitle(): string {
    return this.#pinnedTab?.title ?? "";
  }

  /** Activate (and focus the window of) the pinned tab. */
  focusPinnedTab() {
    const t = this.#pinnedTab;
    if (!t) return;
    void chrome.tabs.update(t.id, { active: true }).catch(() => {});
    void chrome.windows.update(t.windowId, { focused: true }).catch(() => {});
  }

  /**
   * Apply a CSS selector on the page. Resolves true if an element matched,
   * false if none did, and throws if the selector is malformed — mirroring the
   * content-script Canvas.setSelector contract the views were written against
   * (now async because it round-trips to the page).
   */
  async setSelector(css: string): Promise<boolean> {
    const reply = (await this.#request({ type: "setSelector", css })) as
      | { found: boolean; valid: boolean }
      | undefined;
    if (reply && reply.valid === false) throw new Error("Invalid CSS selector");
    return reply?.found ?? false;
  }

  clearSelection() {
    this.#post({ type: "clear" });
  }

  /**
   * Point the canvas's tab at `url` (an alert's watched page) and reconnect once
   * it finishes loading, so the on-page selection lands on the right document.
   * Targets the pinned tab (selection flows pin on entry); a no-op when the tab
   * is already showing that page or there's no tab to drive. Resolves after the
   * reconnect so callers can `setSelector` against the freshly loaded page.
   */
  async navigateTab(url: string): Promise<void> {
    const target = this.#pinnedTab ?? this.#connectedTab;
    // Already there — don't reload and flicker the page.
    if (!target || this.url === url) return;

    const tabId = target.id;
    // Tear the old port down now; the document (and its content script) is about
    // to be replaced by the navigation.
    this.#disconnect();
    this.watchable = false;

    // Drive the navigation and wait for the new document to finish loading
    // before reconnecting — the content script we inject must land on it.
    await new Promise<void>((resolve) => {
      const onComplete = (id: number, info: { status?: string }) => {
        if (id === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onComplete);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(onComplete);
      void chrome.tabs.update(tabId, { url }).catch(() => {
        chrome.tabs.onUpdated.removeListener(onComplete);
        resolve();
      });
    });

    await this.#connect(tabId);
  }

  destroy() {
    chrome.tabs.onActivated.removeListener(this.#rebind);
    chrome.tabs.onUpdated.removeListener(this.#onTabUpdated);
    this.#disconnect();
  }

  // ── port plumbing ─────────────────────────────────────────────────────────

  #rebind = (activeInfo: { tabId: number }) => {
    // Always note which tab is active (drives the "you've switched away from the
    // pinned tab" affordance), but only chase it when not pinned.
    this.#activeTabId = activeInfo.tabId;
    if (this.#pinned) return;
    void this.#connect();
  };

  #onTabUpdated = (
    _tabId: number,
    info: { status?: string },
    tab: chrome.tabs.Tab,
  ) => {
    if (this.#pinned) return;
    // Reconnect once a top-level navigation finishes loading in the tab we're
    // showing — the old content script is gone with the previous document.
    if (info.status === "complete" && tab.active) void this.#connect();
  };

  async #activeTab(): Promise<chrome.tabs.Tab | undefined> {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    return tab;
  }

  async #connect(tabId?: number) {
    const seq = ++this.#connectSeq;
    this.#disconnect();
    // Selection is per-page; drop any mirrored state from the previous tab and
    // assume unwatchable until we've actually connected.
    this.#mirror = { ...EMPTY_MIRROR };
    this.watchable = false;

    // A specific tab id (after navigateTab) is authoritative; otherwise resolve
    // the active tab by query (initial connect / unpin / tab tracking).
    const tab =
      tabId != null
        ? await chrome.tabs.get(tabId).catch(() => undefined)
        : await this.#activeTab();
    if (seq !== this.#connectSeq) return; // superseded by a newer connect
    this.url = tab?.url ?? "";
    this.origin = originOf(tab?.url);
    this.title = "";
    this.#activeTabId = tab?.id ?? null;
    this.#connectedTab =
      tab?.id != null
        ? { id: tab.id, windowId: tab.windowId, title: tab.title ?? "" }
        : null;
    if (!tab?.id) return;

    // chrome://, the web store, PDFs, file:// — nothing to pick on. Leave the
    // raw tab URL/origin in place so the alert list can still match, and let
    // `watchable` stay false so the UI can explain the page can't be watched.
    if (!injectable(tab.url)) return;

    const ensured = await this.#ensureInjected(tab.id);
    if (seq !== this.#connectSeq) return;
    if (!ensured) return;

    const port = chrome.tabs.connect(tab.id, { name: CANVAS_PORT });
    port.onMessage.addListener(this.#onMessage);
    port.onDisconnect.addListener(() => {
      // The page hung up on its own — navigation replaced the document, the tab
      // crashed, or the connect never reached a live listener. Drop the port and
      // fail any in-flight requests so awaiting callers (#connect's getPage,
      // navigateTab, setSelector) don't wedge. Guard on identity so a late
      // disconnect from a superseded port can't drain a newer port's requests.
      if (this.#port === port) {
        console.debug(
          "[klaxon] canvas port disconnected",
          chrome.runtime.lastError?.message ?? "",
        );
        this.#port = null;
        this.#drainPending();
      }
    });
    this.#port = port;
    this.watchable = true;

    // Resolve the canonical URL/title and replay the current active/editable
    // state onto the freshly connected (possibly just-injected) engine.
    const page = (await this.#request({ type: "getPage" })) as
      | { url: string; title: string }
      | undefined;
    if (seq !== this.#connectSeq) return;
    if (page?.url) this.url = page.url;
    if (page?.title) this.title = page.title;
    this.#post({ type: "setActive", active: this.#active });
    this.#post({ type: "setEditable", editable: this.#editable });
  }

  #disconnect() {
    if (this.#port) {
      try {
        this.#port.disconnect();
      } catch {
        /* already gone */
      }
      this.#port = null;
    }
    this.#drainPending();
  }

  // Resolve every in-flight request (undefined) and clear its timeout. Called on
  // explicit teardown and when a port disconnects on its own — otherwise an
  // awaited request whose reply never arrives hangs forever.
  #drainPending() {
    for (const { resolve, timer } of this.#pending.values()) {
      clearTimeout(timer);
      resolve(undefined);
    }
    this.#pending.clear();
  }

  /** Ask the service worker to inject the page content script on demand. */
  async #ensureInjected(tabId: number): Promise<boolean> {
    try {
      const reply = (await chrome.runtime.sendMessage({
        type: "canvas/ensure",
        tabId,
      })) as { ok: boolean } | undefined;
      return reply?.ok ?? false;
    } catch {
      return false;
    }
  }

  #onMessage = (msg: InboundMessage) => {
    if (msg.type === "state") {
      this.#mirror = {
        selector: msg.selector ?? "",
        matchText: msg.matchText ?? "",
        locked: msg.locked ?? false,
        structured: msg.structured,
      };
      return;
    }
    if (msg.type === "reply" && typeof msg.id === "number") {
      const pending = this.#pending.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.#pending.delete(msg.id);
        pending.resolve(msg.data);
      }
    }
  };

  #post(msg: Record<string, unknown>) {
    try {
      this.#port?.postMessage(msg);
    } catch {
      /* port closed between bind and send */
    }
  }

  #request(msg: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve) => {
      if (!this.#port) {
        resolve(undefined);
        return;
      }
      const id = ++this.#reqId;
      // Backstop the reply: if the page never answers, resolve undefined so the
      // caller proceeds (degraded) rather than hanging. The port-disconnect path
      // drains pending too; this covers a live port that simply never replies.
      const timer = setTimeout(() => {
        if (this.#pending.delete(id)) resolve(undefined);
      }, REQUEST_TIMEOUT_MS);
      this.#pending.set(id, { resolve, timer });
      this.#post({ ...msg, id });
    });
  }
}

export function initCanvasClient(): CanvasClient {
  return new CanvasClient();
}

export const [getCanvas, setCanvas] = createContext<CanvasClient>();
