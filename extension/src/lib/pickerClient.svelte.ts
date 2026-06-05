// Panel-side proxy for the on-page picker.
//
// The sidebar UI now lives in a browser-native side panel (an extension page),
// while the element picker (canvas.svelte.ts) stays a content script with
// direct page-DOM access. This module is the bridge: it mirrors the picker's
// state into reactive `$state` and proxies actions to it over a long-lived
// `chrome.tabs` port, so the views can keep talking to a `canvas`-shaped object
// via the getCanvas/setCanvas context exactly as before.
//
// Lifecycle is keyed to the active tab: switching tabs (or a top-level
// navigation completing) tears down the port and reconnects to the new page,
// after ensuring the picker content script is injected there. Because the port
// disconnects when this page unloads, the picker cleans up its overlays on its
// own when the panel closes.
import { createContext } from "svelte";
import type { StructuredSelector } from "./selector";

export const PICKER_PORT = "klaxon-picker";

export interface PickerState {
  readonly selector: string;
  readonly matchText: string;
  readonly locked: boolean;
  readonly structured?: StructuredSelector;
}

const EMPTY_STATE: PickerState = {
  selector: "",
  matchText: "",
  locked: false,
  structured: undefined,
};

/** Reads as `https://…`, the only origins we can inject the picker into. */
function injectable(url: string | undefined): url is string {
  return !!url && /^https?:\/\//.test(url);
}

export class PickerClient {
  // Mirror of the picker's reactive state, fed by `state` port messages.
  #state = $state<PickerState>({ ...EMPTY_STATE });
  /** Canonical URL of the inspected page, resolved from the content script. */
  url = $state("");

  #active = false;
  #editable = true;

  #port: chrome.runtime.Port | null = null;
  #tabId: number | null = null;
  // Bumped on every #connect so overlapping connects (rapid tab switches)
  // can detect they've been superseded and bail instead of leaking a port.
  #connectSeq = 0;

  // Pending request/response calls keyed by an incrementing id (setSelector,
  // getPage). One-way actions (setActive/setEditable/clear) skip this.
  #reqId = 0;
  #pending = new Map<number, (data: unknown) => void>();

  constructor() {
    chrome.tabs.onActivated.addListener(this.#rebind);
    chrome.tabs.onUpdated.addListener(this.#onTabUpdated);
    void this.#connect();
  }

  // ── view-facing API (mirrors the content-script Canvas shape) ─────────────

  get state(): PickerState {
    return this.#state;
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
   * Apply a CSS selector on the page. Resolves true if an element matched,
   * false if none did, and throws if the selector is malformed — mirroring the
   * content-script Canvas.setSelector contract the views were written against.
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

  destroy() {
    chrome.tabs.onActivated.removeListener(this.#rebind);
    chrome.tabs.onUpdated.removeListener(this.#onTabUpdated);
    this.#disconnect();
  }

  // ── port plumbing ─────────────────────────────────────────────────────────

  #rebind = () => {
    void this.#connect();
  };

  #onTabUpdated = (
    _tabId: number,
    info: { status?: string },
    tab: chrome.tabs.Tab,
  ) => {
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

  async #connect() {
    const seq = ++this.#connectSeq;
    this.#disconnect();
    // Selection is per-page; drop any mirrored state from the previous tab.
    this.#state = { ...EMPTY_STATE };

    const tab = await this.#activeTab();
    if (seq !== this.#connectSeq) return; // superseded by a newer connect
    if (!tab?.id) return;

    if (!injectable(tab.url)) {
      // chrome://, the web store, PDFs, file:// — nothing to pick on. Fall back
      // to the raw tab URL so the alert list can still match this page.
      this.url = tab.url ?? "";
      return;
    }

    const ensured = await this.#ensureInjected(tab.id);
    if (seq !== this.#connectSeq) return;
    if (!ensured) {
      this.url = tab.url ?? "";
      return;
    }

    const port = chrome.tabs.connect(tab.id, { name: PICKER_PORT });
    port.onMessage.addListener(this.#onMessage);
    port.onDisconnect.addListener(() => {
      if (this.#port === port) this.#port = null;
    });
    this.#port = port;
    this.#tabId = tab.id;

    // Resolve the canonical URL and replay the current active/editable state
    // onto the freshly connected (possibly just-injected) picker.
    const page = (await this.#request({ type: "getPage" })) as
      | { url: string }
      | undefined;
    if (seq !== this.#connectSeq) return;
    this.url = page?.url || tab.url || "";
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
    this.#tabId = null;
    for (const resolve of this.#pending.values()) resolve(undefined);
    this.#pending.clear();
  }

  /** Ask the service worker to inject the picker content script on demand. */
  async #ensureInjected(tabId: number): Promise<boolean> {
    try {
      const reply = (await chrome.runtime.sendMessage({
        type: "picker/ensure",
        tabId,
      })) as { ok: boolean } | undefined;
      return reply?.ok ?? false;
    } catch {
      return false;
    }
  }

  #onMessage = (msg: { type: string; [k: string]: unknown }) => {
    if (msg.type === "state") {
      this.#state = {
        selector: (msg.selector as string) ?? "",
        matchText: (msg.matchText as string) ?? "",
        locked: (msg.locked as boolean) ?? false,
        structured: msg.structured as StructuredSelector | undefined,
      };
      return;
    }
    if (msg.type === "reply" && typeof msg.id === "number") {
      const resolve = this.#pending.get(msg.id);
      if (resolve) {
        this.#pending.delete(msg.id);
        resolve(msg.data);
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
      this.#pending.set(id, resolve);
      this.#post({ ...msg, id });
    });
  }
}

export function initPickerClient(): PickerClient {
  return new PickerClient();
}

export const [getCanvas, setCanvas] = createContext<PickerClient>();
