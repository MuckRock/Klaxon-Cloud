// Reactive auth client for the sidebar/content-script side.
//
// All heavy lifting (PKCE, token exchange, storage) happens in the service
// worker at static/background.js. This module sends messages to the SW and
// mirrors the stored auth record into a reactive $state for the UI.

const STORAGE_KEY = "muckrock_auth";
const DEFAULT_SCOPES = "openid profile email uuid organizations";

export interface AuthUser {
  sub?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface StoredAuth {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  issued_at: number;
  user: AuthUser | null;
}

export type AuthStatus = "idle" | "authenticating" | "authenticated" | "error";

export const authState = $state<{
  status: AuthStatus;
  user: AuthUser | null;
  expiresAt: number | null;
  error: string | null;
}>({
  status: "idle",
  user: null,
  expiresAt: null,
  error: null,
});

function config() {
  const host = import.meta.env.MUCKROCK_ACCOUNTS_HOST;
  const clientId = import.meta.env.MUCKROCK_CLIENT_ID;
  const scopes = import.meta.env.MUCKROCK_SCOPES ?? DEFAULT_SCOPES;
  if (!host || !clientId) {
    const missing = [
      !host && "MUCKROCK_ACCOUNTS_HOST",
      !clientId && "MUCKROCK_CLIENT_ID",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Missing ${missing} — values are baked in at build time, so rebuild the extension (npm run build) and reload it in chrome://extensions after editing .env.`,
    );
  }
  return { host, clientId, scopes };
}

interface SWReply<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function send<T>(type: string, extra: object = {}): Promise<T> {
  const reply = (await chrome.runtime.sendMessage({
    type,
    ...extra,
  })) as SWReply<T> | undefined;
  if (!reply?.ok) {
    throw new Error(reply?.error ?? "no reply from service worker");
  }
  return reply.data as T;
}

function applyStored(stored: StoredAuth | null) {
  if (!stored) {
    authState.status = "idle";
    authState.user = null;
    authState.expiresAt = null;
    authState.error = null;
    return;
  }
  authState.status = "authenticated";
  authState.user = stored.user;
  authState.expiresAt = stored.issued_at + stored.expires_in * 1000;
  authState.error = null;
}

export async function restore(retry = true): Promise<void> {
  try {
    const stored = await send<StoredAuth | null>("auth/state");
    applyStored(stored);
  } catch {
    // SW may not be ready on first inject — retry once after a short delay.
    // If still no SW, leave state as idle; user can sign in manually.
    if (retry) setTimeout(() => restore(false), 200);
  }
}

export async function login(): Promise<void> {
  try {
    authState.status = "authenticating";
    authState.error = null;
    const stored = await send<StoredAuth>("auth/login", { config: config() });
    applyStored(stored);
  } catch (err) {
    authState.status = "error";
    authState.error = err instanceof Error ? err.message : String(err);
  }
}

export async function logout(): Promise<void> {
  const { host } = config();
  await send("auth/logout", { config: { host } });
  applyStored(null);
}

export async function getAccessToken(): Promise<string | null> {
  const { host, clientId } = config();
  return send<string | null>("auth/token", {
    config: { host, clientId },
  });
}

// Keep state in sync when the SW writes new tokens (e.g. after a silent refresh
// triggered by another tab's getAccessToken call). Content scripts don't
// always see chrome.storage even with the "storage" permission (page CSP,
// isolated-world quirks) — guard so a failure here doesn't take down the
// sidebar. login/logout update authState directly on completion, so the
// listener is strictly a cross-tab convenience.
if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(STORAGE_KEY in changes)) return;
    applyStored((changes[STORAGE_KEY].newValue as StoredAuth | null) ?? null);
  });
}
