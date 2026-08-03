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
import { createContext, untrack } from "svelte";

export const CANVAS_PORT = "klaxon-canvas";

/** How long to wait for a page reply before giving up (ms). Local IPC is
 *  near-instant; this only fires when the page never answers (handler threw
 *  before postMessage, the message was lost, the page is wedged). */
const REQUEST_TIMEOUT_MS = 5000;

/** How long to wait for a driven tab navigation to finish loading (ms) before
 *  reconnecting anyway. Page loads legitimately take seconds, so this is just a
 *  backstop against a navigation that never reports complete (hung load, a
 *  download, a closed tab). */
const NAVIGATE_TIMEOUT_MS = 15000;

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

/**
 * Panel→page messages: fire-and-forget actions plus requests. A request is sent
 * with a correlation `id` the page echoes back in its `reply` (see Replies);
 * actions get no id. This is the single source of truth for the wire protocol —
 * `page.svelte.ts` imports it so the two realms can't drift.
 */
export type Outbound =
  | { type: "setActive"; active: boolean }
  | { type: "setEditable"; editable: boolean }
  | { type: "clear" }
  | { type: "setSelector"; css: string }
  | { type: "getPage" };

/** Reply payload for each request, keyed by the request's `type`. */
export interface Replies {
  setSelector: { found: boolean; valid: boolean };
  getPage: { url: string; title: string };
}

/** The subset of Outbound messages that expect a reply. */
type RequestMessage = Extract<Outbound, { type: keyof Replies }>;

/** A request as the page receives it: tagged with the correlation id. */
export type PanelRequest = RequestMessage & { id: number };

/** Everything the page receives over the port: one-way actions + requests. */
export type PanelMessage = Exclude<Outbound, RequestMessage> | PanelRequest;

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

/** Normalize for "same document" comparison: drop the fragment (a hash change
 *  is same-document) and a trailing slash on the path, so cosmetic differences
 *  between a page's canonical URL and a stored alert `site` don't count. */
function canonicalize(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  return u.href;
}

/** True when two URLs address the same document — everything but the fragment
 *  and a trailing slash matches (the query string is significant). Falls back to
 *  string equality on unparseable input (e.g. an empty/restricted url). */
function sameDocument(a: string, b: string): boolean {
  try {
    return canonicalize(a) === canonicalize(b);
  } catch {
    return a === b;
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

  // A navigateTab in flight. Deliberately NOT $state: it guards re-entrancy, and
  // a reactive read would put it right back in the dependency cycle below.
  #navigating = false;

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
    // Entering a flow: inject the picker into the pinned tab (host access was
    // granted by the requestWatch() in the originating gesture). Leaving: drop
    // the port and resume metadata-only tracking.
    if (v) void this.#connectInjected(this.#connectedTab?.id);
    else void this.#connect();
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
    const reply = await this.#request({ type: "setSelector", css });
    if (reply && reply.valid === false) throw new Error("Invalid CSS selector");
    return reply?.found ?? false;
  }

  clearSelection() {
    this.#post({ type: "clear" });
  }

  /**
   * Request host access for `origin` (defaults to the active tab's origin) so
   * the picker can be injected there. MUST be called from within a user-gesture
   * handler, before any other await — chrome.permissions.request consumes the
   * user activation. Granted origins persist, so this prompts at most once per
   * site (and resolves true immediately when already granted). Returns whether
   * access is held afterward.
   */
  async requestWatch(origin?: string): Promise<boolean> {
    const o = origin ?? this.origin;
    if (!o) return false;
    try {
      return await chrome.permissions.request({ origins: [`${o}/*`] });
    } catch {
      return false;
    }
  }

  /**
   * Point the canvas's tab at `url` (an alert's watched page) and reconnect once
   * it finishes loading, so the on-page selection lands on the right document.
   * Targets the pinned tab (selection flows pin on entry); a no-op when the tab
   * is already showing that page or there's no tab to drive. Resolves after the
   * reconnect so callers can `setSelector` against the freshly loaded page.
   *
   * Our callers are `$effect`s (ViewAlert/EditAlert), and an async function's
   * body runs synchronously up to its first `await` — so anything this prologue
   * reads reactively becomes a dependency of *their* effect. Since the
   * navigation writes `url`/`#pinnedTab` on reconnect, such a read would make
   * the effect re-run and navigate again, forever (issue #94). Hence `untrack`
   * here, and hence the guard below asking the tab where it is rather than
   * reading the mirrored (reactive) `this.url`.
   */
  async navigateTab(url: string): Promise<void> {
    if (this.#navigating) return;
    const target = untrack(() => this.#pinnedTab) ?? this.#connectedTab;
    if (!target) return;

    // Claim the flag before the first await, so two calls in the same tick can't
    // both pass the check above and drive the tab twice.
    this.#navigating = true;
    try {
      // Already there — don't reload and flicker the page. Ask the tab for its
      // actual URL: `this.url` holds what the *page* claims is canonical, which
      // may name a different document altogether (or not even be absolute), in
      // which case this guard could never latch. Compare by document (ignoring
      // fragment/trailing slash) so cosmetic differences between the tab's URL
      // and the stored `site` still count as "already there".
      const current = await chrome.tabs.get(target.id).catch(() => undefined);
      if (current?.url && sameDocument(current.url, url)) return;

      // Tear the old port down now; the document (and its content script) is
      // about to be replaced by the navigation.
      this.#disconnect();
      this.watchable = false;

      // Drive the navigation and wait for the new document to finish loading
      // before reconnecting — the content script we inject must land on it.
      await this.#awaitTabComplete(target.id, url);
      await this.#connectInjected(target.id);
    } finally {
      this.#navigating = false;
    }
  }

  /**
   * Drive `tabId` to `url` and resolve once that navigation finishes loading.
   * Only accepts `complete` after first seeing the `loading` tick our own
   * navigation triggers, so a stale `complete` already queued for the previous
   * document can't resolve us early. Resolves (rather than hangs) if the tab
   * never reports complete — see NAVIGATE_TIMEOUT_MS.
   */
  #awaitTabComplete(tabId: number, url: string): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      let navigating = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      };
      const timer = setTimeout(finish, NAVIGATE_TIMEOUT_MS);
      const onUpdated = (id: number, info: { status?: string }) => {
        if (id !== tabId) return;
        if (info.status === "loading") navigating = true;
        else if (info.status === "complete" && navigating) finish();
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      void chrome.tabs.update(tabId, { url }).catch(finish);
    });
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

  /**
   * Resolve the active (or a specific) tab and mirror its URL / origin / title
   * and tab refs into panel state. Shared by tracking #connect and the
   * inject-and-connect path. Returns the resolved tab (undefined when there's
   * none, or the connect was already superseded). Callers re-check `seq` after
   * any further await.
   */
  async #resolve(
    seq: number,
    tabId?: number,
  ): Promise<chrome.tabs.Tab | undefined> {
    // A specific tab id (after navigateTab) is authoritative; otherwise resolve
    // the active tab by query (initial connect / unpin / tab tracking).
    const tab =
      tabId != null
        ? await chrome.tabs.get(tabId).catch(() => undefined)
        : await this.#activeTab();
    if (seq !== this.#connectSeq) return undefined; // superseded
    this.url = tab?.url ?? "";
    this.origin = originOf(tab?.url);
    this.title = "";
    this.#connectedTab =
      tab?.id != null
        ? { id: tab.id, windowId: tab.windowId, title: tab.title ?? "" }
        : null;
    // While pinned we only (re)connect to the pinned tab itself — navigateTab
    // drove it to the alert's page — so refresh the pinned ref to pick up the
    // new title; otherwise the "jump back" affordance keeps showing the title
    // captured when the flow began.
    if (
      this.#pinned &&
      this.#pinnedTab &&
      this.#connectedTab?.id === this.#pinnedTab.id
    ) {
      this.#pinnedTab = this.#connectedTab;
    }
    return tab ?? undefined;
  }

  /**
   * Tracking-mode connect: mirror the active tab's URL / origin / title, but do
   * NOT inject. The picker is added only when the user explicitly starts a watch
   * flow (#connectInjected), so we never touch a page without a user action and
   * need no standing host access. `watchable` reflects whether the page *could*
   * be watched (an ordinary http/https document), not whether we've injected.
   */
  async #connect(tabId?: number) {
    const seq = ++this.#connectSeq;
    this.#disconnect();
    // Selection is per-page; drop any mirrored state from the previous tab.
    this.#mirror = { ...EMPTY_MIRROR };
    const tab = await this.#resolve(seq, tabId);
    if (seq !== this.#connectSeq) return;
    // Tracking owns the active-tab ref (so `away` is right while pinned); the
    // injected connect targets a specific tab and must not clobber it.
    this.#activeTabId = tab?.id ?? null;
    this.watchable = injectable(tab?.url);
  }

  /**
   * Inject the picker into `tabId` (or the active tab) and open the port, then
   * round-trip getPage and replay active/editable. Used on selection-flow entry
   * (set pinned) and by navigateTab. Assumes host access for the tab's origin is
   * already granted — requestWatch() runs in the gesture that starts the flow.
   */
  async #connectInjected(tabId?: number) {
    const seq = ++this.#connectSeq;
    this.#disconnect();
    // Selection is per-page; drop any mirrored state from the previous tab and
    // assume unwatchable until we've actually connected.
    this.#mirror = { ...EMPTY_MIRROR };
    this.watchable = false;

    const tab = await this.#resolve(seq, tabId);
    if (seq !== this.#connectSeq) return;
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
      // fail any in-flight requests so awaiting callers (getPage, navigateTab,
      // setSelector) don't wedge. Guard on identity so a late
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
    const page = await this.#request({ type: "getPage" });
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

  #post(msg: Outbound) {
    try {
      this.#port?.postMessage(msg);
    } catch {
      /* port closed between bind and send */
    }
  }

  #request<M extends RequestMessage>(
    msg: M,
  ): Promise<Replies[M["type"]] | undefined> {
    return new Promise((resolve) => {
      const port = this.#port;
      if (!port) {
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
      this.#pending.set(id, {
        resolve: resolve as (d: unknown) => void,
        timer,
      });
      try {
        port.postMessage({ ...msg, id } satisfies PanelRequest);
      } catch {
        /* port closed between the null-check and the send; the disconnect
           handler or the timeout resolves the pending entry */
      }
    });
  }
}

export function initCanvasClient(): CanvasClient {
  return new CanvasClient();
}

export const [getCanvas, setCanvas] = createContext<CanvasClient>();
