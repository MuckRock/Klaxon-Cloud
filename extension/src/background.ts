// Klaxon Cloud service worker.
//
// Two responsibilities:
//   1. Inject the content script when the action button is clicked.
//   2. Handle OIDC auth messages from the content script (PKCE flow against
//      Squarelet). All network + storage work lives here because
//      chrome.identity.launchWebAuthFlow is not available to content scripts.

import {
  buildAuthorizeUrl,
  decodeJwtPayload,
  endpoints,
  pkceChallenge,
  randomBase64Url,
} from "./lib/oidc.ts";

// Log the OAuth redirect URI on every SW boot — register this exact string
// with the Squarelet client. Remove once the URI is stable across environments.
console.log("[klaxon] OAuth redirect URI:", chrome.identity.getRedirectURL());

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    files: ["content.js"],
  });
});

const STORAGE_KEY = "muckrock_auth";

interface AuthConfig {
  host: string;
  clientId: string;
  scopes: string;
}

interface StoredAuth {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  issued_at: number;
  user: Record<string, unknown> | null;
}

async function readStored(): Promise<StoredAuth | null> {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  return (r[STORAGE_KEY] as StoredAuth) ?? null;
}

async function writeStored(data: StoredAuth): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

async function clearStored(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

async function signIn({ host, clientId, scopes }: AuthConfig): Promise<StoredAuth> {
  const ep = endpoints(host);
  const verifier = randomBase64Url(64);
  const challenge = await pkceChallenge(verifier);
  const state = randomBase64Url(32);
  const nonce = randomBase64Url(16);
  const redirectUri = chrome.identity.getRedirectURL();

  const authorizeUrl = buildAuthorizeUrl({
    host,
    clientId,
    scopes,
    redirectUri,
    state,
    nonce,
    codeChallenge: challenge,
  });

  const finalUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizeUrl,
    interactive: true,
  });
  if (!finalUrl) throw new Error("Authorization cancelled");

  const cb = new URL(finalUrl);
  const err = cb.searchParams.get("error");
  if (err) throw new Error(`Authorization error: ${err}`);
  if (cb.searchParams.get("state") !== state) throw new Error("State mismatch");
  const code = cb.searchParams.get("code");
  if (!code) throw new Error("No authorization code");

  const tokenResp = await fetch(ep.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!tokenResp.ok) {
    throw new Error(
      `Token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`,
    );
  }
  const tokens = await tokenResp.json();

  const idPayload = decodeJwtPayload(tokens.id_token);
  if (idPayload.nonce !== nonce) throw new Error("ID token nonce mismatch");
  if (idPayload.aud !== clientId) throw new Error("ID token audience mismatch");

  let user = null;
  try {
    const userResp = await fetch(ep.userinfo, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userResp.ok) user = await userResp.json();
  } catch {
    // userinfo is best-effort; the ID token already carries the sub.
  }

  const stored: StoredAuth = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    expires_in: tokens.expires_in,
    issued_at: Date.now(),
    user,
  };
  await writeStored(stored);
  return stored;
}

async function refreshTokens({ host, clientId }: Omit<AuthConfig, "scopes">): Promise<StoredAuth | null> {
  const ep = endpoints(host);
  const stored = await readStored();
  if (!stored?.refresh_token) return null;

  const resp = await fetch(ep.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refresh_token,
      client_id: clientId,
    }),
  });
  if (!resp.ok) {
    await clearStored();
    return null;
  }
  const tokens = await resp.json();
  const fresh: StoredAuth = {
    ...stored,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? stored.refresh_token,
    id_token: tokens.id_token ?? stored.id_token,
    expires_in: tokens.expires_in,
    issued_at: Date.now(),
  };
  await writeStored(fresh);
  return fresh;
}

// Dedupe concurrent refresh calls so multiple callers share one network round-trip.
let refreshPromise: Promise<StoredAuth | null> | null = null;
function dedupedRefresh(args: Omit<AuthConfig, "scopes">): Promise<StoredAuth | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens(args).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function accessToken({ host, clientId }: Omit<AuthConfig, "scopes">): Promise<string | null> {
  const stored = await readStored();
  if (!stored) return null;
  const expiresAt = stored.issued_at + stored.expires_in * 1000 - 30_000;
  if (Date.now() < expiresAt) return stored.access_token;
  const fresh = await dedupedRefresh({ host, clientId });
  return fresh?.access_token ?? null;
}

async function signOut({ host }: Pick<AuthConfig, "host">): Promise<void> {
  const ep = endpoints(host);
  const stored = await readStored();
  await clearStored();
  if (!stored?.id_token) return;
  const url = new URL(ep.endSession);
  url.search = new URLSearchParams({
    id_token_hint: stored.id_token,
    post_logout_redirect_uri: chrome.identity.getRedirectURL(),
  }).toString();
  try {
    await chrome.identity.launchWebAuthFlow({
      url: url.toString(),
      interactive: true,
    });
  } catch {
    // launchWebAuthFlow throws on close — tokens are already cleared locally.
  }
}

interface AuthMessage {
  type: string;
  config: AuthConfig;
}

chrome.runtime.onMessage.addListener((msg: AuthMessage, _sender, sendResponse) => {
  if (!msg?.type?.startsWith?.("auth/")) return false;
  (async () => {
    try {
      switch (msg.type) {
        case "auth/login":
          sendResponse({ ok: true, data: await signIn(msg.config) });
          break;
        case "auth/logout":
          await signOut(msg.config);
          sendResponse({ ok: true });
          break;
        case "auth/token":
          sendResponse({ ok: true, data: await accessToken(msg.config) });
          break;
        case "auth/state":
          sendResponse({ ok: true, data: await readStored() });
          break;
        default:
          sendResponse({ ok: false, error: `unknown message: ${msg.type}` });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return true;
});
