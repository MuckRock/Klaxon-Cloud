// Klaxon Cloud service worker.
//
// Responsibilities:
//   1. Open the native side panel when the action button is clicked, and
//      inject the picker content script on demand when the panel asks.
//   2. Handle OIDC auth messages from the side panel (PKCE flow against
//      Squarelet). All network + storage work lives here because
//      chrome.identity.launchWebAuthFlow is not available to non-extension
//      pages, and proxying fetch here sidesteps page CORS.
import type {
  AuthConfig,
  AuthMessage,
  FetchMessage,
  PickerEnsureMessage,
  StoredAuth,
} from "./lib/types";
import {
  buildAuthorizeUrl,
  decodeJwtPayload,
  endpoints,
  exchangeOidcForJwt,
  getAuthToken,
  getUserInfo,
  hasJwtExpired,
  isValidStoredAuth,
  pkceChallenge,
  randomBase64Url,
  refreshJwt,
} from "./lib/oidc.ts";

// Log the OAuth redirect URI on every SW boot — register this exact string
// with the Squarelet client. Remove once the URI is stable across environments.
console.log("[klaxon] OAuth redirect URI:", chrome.identity.getRedirectURL());

// Chrome: clicking the action opens the native side panel. The picker content
// script is injected lazily (see "picker/ensure" below) — not on click — so we
// only touch the page when the user actually starts picking.
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.debug("[klaxon] setPanelBehavior:", err));

// Firefox opens its sidebar (sidebar_action) from the browser's own sidebar
// button, so no action handler is needed there.

// Inject the picker into a tab on request from the side panel. Re-injection is
// harmless: the content script guards against double-mounting.
async function ensurePicker(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

// Save auth data to local storage
const STORAGE_KEY = "muckrock_auth";

async function readStored(): Promise<StoredAuth | null> {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  const value = r[STORAGE_KEY];
  if (!isValidStoredAuth(value)) {
    // Drop legacy / partial records so the rest of the SW only sees the
    // three-slot shape. Users on the old `{auth, userinfo}` storage get
    // signed out once; next sign-in writes the new shape.
    if (value !== undefined) await clearStored();
    return null;
  }
  return value;
}

async function writeStored(data: StoredAuth): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

async function clearStored(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

async function signIn({
  host,
  clientId,
  scopes,
}: AuthConfig): Promise<StoredAuth> {
  // The first step of signing in is to send users to MuckRock Accounts.
  // This is where they enter their username and password.
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

  // Now that we've completed authorization, we have a redirect URI with
  // a `code` parameter. We use this code for a token exchange.
  const cb = new URL(finalUrl);
  const err = cb.searchParams.get("error");
  if (err) throw new Error(`Authorization error: ${err}`);
  if (cb.searchParams.get("state") !== state) throw new Error("State mismatch");
  const code = cb.searchParams.get("code");
  if (!code) throw new Error("No authorization code");

  const oidc = await getAuthToken(
    ep.token,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  );
  const idPayload = decodeJwtPayload(oidc.id_token);
  if (idPayload.nonce !== nonce) throw new Error("ID token nonce mismatch");
  if (idPayload.aud !== clientId) throw new Error("ID token audience mismatch");

  // Userinfo and JWT exchange are both gated only on the OIDC access token —
  // run them in parallel.
  const [userinfo, jwt] = await Promise.all([
    getUserInfo(ep.userinfo, oidc.access_token),
    exchangeOidcForJwt(ep.jwt, oidc.access_token),
  ]);

  const stored: StoredAuth = { oidc, jwt, userinfo };
  await writeStored(stored);
  return stored;
}

async function refreshTokens({
  host,
  clientId,
}: Omit<AuthConfig, "scopes">): Promise<StoredAuth | null> {
  // Two refresh tiers:
  //   1. Refresh the DC JWT directly via /api/refresh/. Cheapest path; no
  //      userinfo round-trip and the OIDC token stays put.
  //   2. Fall back to refreshing the OIDC token, then re-mint a JWT and
  //      re-fetch userinfo. If that fails too, the user has to sign in again.
  const ep = endpoints(host);
  const stored = await readStored();
  if (!stored) return null;

  try {
    const jwt = await refreshJwt(ep.jwtRefresh, stored.jwt.refresh_token);
    const fresh: StoredAuth = { ...stored, jwt };
    await writeStored(fresh);
    return fresh;
  } catch (err) {
    console.warn("[klaxon] JWT refresh failed:", err);
  }

  try {
    const oidc = await getAuthToken(
      ep.token,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: stored.oidc.refresh_token,
        client_id: clientId,
      }),
    );
    const [userinfo, jwt] = await Promise.all([
      getUserInfo(ep.userinfo, oidc.access_token),
      exchangeOidcForJwt(ep.jwt, oidc.access_token),
    ]);
    const fresh: StoredAuth = { oidc, jwt, userinfo };
    await writeStored(fresh);
    return fresh;
  } catch (err) {
    console.warn("[klaxon] OIDC refresh failed:", err);
    await clearStored();
    return null;
  }
}

// Dedupe concurrent refresh calls so multiple callers share one network round-trip.
let refreshPromise: Promise<StoredAuth | null> | null = null;
function dedupedRefresh(
  args: Omit<AuthConfig, "scopes">,
): Promise<StoredAuth | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens(args).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function accessToken({
  host,
  clientId,
}: Omit<AuthConfig, "scopes">): Promise<string | null> {
  // Returns the DC JWT — that's what the DocumentCloud API accepts. If it's
  // still valid, return it directly; otherwise kick off a (deduped) refresh.
  const stored = await readStored();
  if (!stored) return null;
  if (!hasJwtExpired(stored.jwt.access_token)) return stored.jwt.access_token;
  const fresh = await dedupedRefresh({ host, clientId });
  return fresh?.jwt.access_token ?? null;
}

async function signOut({ host }: Pick<AuthConfig, "host">): Promise<void> {
  // When signing out, we want to do two things:
  // 1. Clear any stored credentials
  // 2. Notify Squarelet we're signing out
  // 3. Redirect to the client's post-signout URI
  const ep = endpoints(host);
  const stored = await readStored();
  await clearStored();
  if (!stored) return;
  const url = new URL(ep.endSession);
  url.search = new URLSearchParams({
    id_token_hint: stored.oidc.id_token,
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

type SwMessage = AuthMessage | FetchMessage | PickerEnsureMessage;

function isAuthMessage(t: SwMessage): t is AuthMessage {
  return t.type.startsWith("auth/");
}

function isFetchMessage(t: SwMessage): t is FetchMessage {
  return t.type === "api/fetch";
}

function isPickerEnsure(t: SwMessage): t is PickerEnsureMessage {
  return t.type === "picker/ensure";
}

chrome.runtime.onMessage.addListener(
  (msg: SwMessage, _sender, sendResponse) => {
    if (!msg?.type) return false;

    if (isPickerEnsure(msg)) {
      (async () => {
        try {
          await ensurePicker(msg.tabId);
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({
            ok: false,
            error: (e as Error)?.message ?? String(e),
          });
        }
      })();
      return true;
    }

    if (isFetchMessage(msg)) {
      (async () => {
        try {
          const resp = await fetch(msg.url, msg.options);
          const body = resp.headers
            .get("content-type")
            ?.includes("application/json")
            ? await resp.json()
            : await resp.text();
          sendResponse({
            ok: true,
            data: { status: resp.status, statusText: resp.statusText, body },
          });
        } catch (e) {
          sendResponse({
            ok: false,
            error: (e as Error)?.message ?? String(e),
          });
        }
      })();
      return true;
    }

    if (!isAuthMessage(msg)) return false;
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
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return true;
  },
);
