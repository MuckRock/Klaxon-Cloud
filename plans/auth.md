# Browser extension OAuth (Squarelet)

## Goal

Sign the user into Squarelet from the Klaxon Cloud browser extension using OIDC authorization code + PKCE, with all business logic centralized in [extension/src/lib/auth.svelte.ts](../extension/src/lib/auth.svelte.ts). Persist tokens across sessions, refresh them silently, and expose a reactive `user`/`token` state that the sidebar and future features can read.

## Research summary

Research in [research/squarelet-oauth-extension/](../research/squarelet-oauth-extension/) confirmed that **Squarelet's OIDC server already supports the flow we need.** Squarelet pins `django-oidc-provider==0.9.0`, which implements public clients + PKCE (`S256` and `plain`) natively:

- `oidc_provider/models.py` — `Client.client_type` includes both `"confidential"` and `"public"`.
- `oidc_provider/lib/endpoints/token.py` L56–63 — `client_secret` is only validated for confidential clients; a public client can exchange a code with no secret.
- `oidc_provider/lib/endpoints/token.py` L85–103 — PKCE `S256`/`plain` verification is implemented. If `code_challenge` was set at authorize time, the token endpoint requires `code_verifier`.
- `oidc_provider/lib/endpoints/authorize.py` L88–89, L138–153 — authorize endpoint reads and persists `code_challenge`/`code_challenge_method`.
- `oidc_provider/lib/endpoints/authorize.py` L103 — redirect URI is exact-string match, which is exactly what `chrome.identity.launchWebAuthFlow`'s fixed redirect URL needs.

Squarelet's own `squarelet/oidc/views.py` only overrides `TokenEndpoint.create_code_response_dic` (to swap in SimpleJWT tokens); it inherits `validate_params`, so public-client + PKCE behavior is preserved.

**No Squarelet code changes are strictly required.** Three operational changes are needed (one is optional hardening):

1. Register a public OIDC client with the extension's redirect URIs.
2. Add the extension origins to `CORS_ORIGIN_WHITELIST` on production.
3. (Recommended) Patch the discovery document so strict OIDC client libraries will emit PKCE and accept `token_endpoint_auth_method=none`.

A minimal reference extension implementation is checked in at [research/squarelet-oauth-extension/extension/](../research/squarelet-oauth-extension/extension/) — MV3, no bundler, no npm deps, points at production Squarelet. Use it as a reference for the PKCE/token/userinfo/end-session shapes.

## Squarelet-side changes

### 1. Register a public OIDC client (blocking)

Create a new OIDC `Client` via Django admin (or fixture) with:

- `client_type = "public"`
- `client_id = "muckrock-extension"` (or similar stable identifier)
- `client_secret` empty (won't be checked for public clients)
- `response_types = ["code"]`
- `redirect_uris`: one per target
  - Chrome/Edge/Brave: `https://<CHROME_EXT_ID>.chromiumapp.org/`
  - Firefox: value returned by `browser.identity.getRedirectURL()` — format `https://<ADDON_UUID>.extensions.allizom.org/`
  - Any dev/staging variants
- `post_logout_redirect_uris`: same set
- `scope = "openid profile email uuid organizations"` (add `preferences`, `bio` if needed — these are the scopes Squarelet actually supports)

### 2. CORS on production (blocking)

The extension fetches `/openid/token` and `/openid/userinfo` directly from a `chrome-extension://` / `moz-extension://` origin. Without CORS headers, the browser blocks those fetches.

Squarelet already uses `django-cors-headers` with an env-driven `CORS_ORIGIN_WHITELIST` (default `[]`) and `CORS_ALLOW_CREDENTIALS = True`. Add extension origins to the production env:

- `chrome-extension://<CHROME_EXT_ID>`
- `moz-extension://<FIREFOX_ADDON_UUID>` (per-install — consider a scoped regex instead)

No code change needed, just production config.

### 3. Fix the discovery document (recommended, small patch)

`oidc_provider/views.py` `ProviderInfoView._build_response_dict` hard-codes:

- `token_endpoint_auth_methods_supported = ["client_secret_post", "client_secret_basic"]` (missing `"none"`)
- No `code_challenge_methods_supported`
- No `grant_types_supported`
- No `scopes_supported`

The server *behavior* already supports PKCE + public clients; the metadata just lies about it. Strict clients (`oidc-client-ts` with `validateSubOnRefresh`, some Go/Rust clients) will refuse to emit PKCE or register a client with `token_endpoint_auth_method: "none"` based on the discovery doc alone.

Override `ProviderInfoView` in `squarelet/oidc/views.py`:

```python
from oidc_provider.views import ProviderInfoView as _ProviderInfoView

class ProviderInfoView(_ProviderInfoView):
    def _build_response_dict(self, request):
        dic = super()._build_response_dict(request)
        dic["code_challenge_methods_supported"] = ["S256", "plain"]
        if "none" not in dic["token_endpoint_auth_methods_supported"]:
            dic["token_endpoint_auth_methods_supported"].append("none")
        dic["grant_types_supported"] = [
            "authorization_code",
            "refresh_token",
            "client_credentials",
        ]
        dic["scopes_supported"] = [
            "openid", "profile", "email",
            "uuid", "organizations", "preferences", "bio",
        ]
        return dic
```

Wire it in `config/urls.py` before the stock `include("oidc_provider.urls")`.

Our in-house extension uses hand-rolled OIDC logic so it will work without this patch, but it's cheap hardening for every future client.

### Nice-to-haves (not blocking)

- **Refresh-token reuse detection.** The current token endpoint rotates refresh tokens on use (deletes the old one) but doesn't revoke the whole token family when a used refresh is replayed. Standard hardening for public clients.
- **Disable ROPC** (`OIDC_GRANT_TYPE_PASSWORD_ENABLE = False` — currently `True`). OAuth 2.1 removes it; larger attack surface for no current gain.
- **Introspection** (`/openid/introspect`). Public clients can't meaningfully call it without a secret. Leave scoped to confidential clients; not needed for v1.

## Klaxon-side external dependencies

After the Squarelet changes above, the remaining blockers on the extension side are:

1. **Stable extension ID during dev.** Add a `"key"` field to [extension/static/manifest.json](../extension/static/manifest.json) so the unpacked extension's ID (and therefore redirect URI) doesn't change on every reload. Generate once, commit the public key, register the resulting redirect URI with Squarelet. For Firefox, pin `browser_specific_settings.gecko.id`.
2. **Client ID registration.** Need the final `client_id` from Squarelet admin before the extension can authenticate against production.

## Endpoints (hardcoded from production discovery)

From `https://accounts.muckrock.com/openid/.well-known/openid-configuration/`:

- Issuer: `https://accounts.muckrock.com/openid`
- Authorize: `https://accounts.muckrock.com/openid/authorize`
- Token: `https://accounts.muckrock.com/openid/token`
- Userinfo: `https://accounts.muckrock.com/openid/userinfo`
- End-session: `https://accounts.muckrock.com/openid/end-session`
- JWKS: `https://accounts.muckrock.com/openid/jwks`

No need to fetch the well-known at runtime — the issuer is fixed per deployment.

## Architecture

```
content script (main.svelte.ts)
  └─ sendMessage({type: "auth/login"}) ──▶ background SW ──▶ auth.svelte.ts
                                                              │
                                      launchWebAuthFlow ◀─────┤
                                      fetch token endpoint ◀──┤
                                      chrome.storage ◀────────┘
```

- `auth.svelte.ts` — pure logic. No direct DOM. Callable from the background SW. Exports `login()`, `logout()`, `getAccessToken()`, and a reactive `authState` (`$state` rune) with `{status, user, expiresAt}`.
- `src/background/index.ts` (new) — service worker. Registers `chrome.runtime.onMessage` handlers that delegate to `auth.svelte.ts`. Also owns the refresh-before-expiry timer.
- Content script — sends messages, never touches `chrome.identity` directly. Subscribes to auth state via `chrome.storage.onChanged` (or a `chrome.runtime.Port` for push updates to the Svelte sidebar).

### Why the split

`chrome.identity.launchWebAuthFlow` is unavailable in content scripts. Putting the flow in the background SW is the only correct place. `auth.svelte.ts` stays the single source of business logic; the background is just the execution context.

## Implementation steps

### 1. Manifest + build

- Add `"identity"` and `"storage"` to `permissions` in [extension/static/manifest.json](../extension/static/manifest.json).
- Add `"host_permissions"` for `https://accounts.muckrock.com/*` (plus `api.muckrock.com`, `www.documentcloud.org` as needed).
- Add `"key"` field (generated once) for stable extension ID in dev.
- Add `browser_specific_settings.gecko.id` for stable Firefox ID.
- Wire a new background entry in [extension/vite.config.ts](../extension/vite.config.ts): second rollup input `src/background/index.ts` → `build/background.js`. Manifest already references `background.service_worker: "background.js"`.
- Add new env vars to `.env` (and a committed `.env.example`):
  - `MUCKROCK_CLIENT_ID` — the public client ID registered in Squarelet admin.
  - `MUCKROCK_SCOPES="openid profile email uuid organizations"`.
  - `MUCKROCK_ISSUER="https://accounts.muckrock.com/openid"` (override for staging).

### 2. `auth.svelte.ts` — pure logic

Public surface:

```ts
export const authState = $state<{
  status: "idle" | "authenticating" | "authenticated" | "error";
  user: UserInfo | null;
  expiresAt: number | null;
  error?: string;
}>({ status: "idle", user: null, expiresAt: null });

export async function login(): Promise<void>;
export async function logout(): Promise<void>;
export async function getAccessToken(): Promise<string | null>; // refreshes if near-expiry
export async function restore(): Promise<void>;  // called on SW startup
```

Internal pieces (mirrors [research/squarelet-oauth-extension/extension/src/auth.js](../research/squarelet-oauth-extension/extension/src/auth.js)):

- **Endpoints.** Hardcode from the discovery doc (see above). No runtime well-known fetch.
- **PKCE helpers.** `crypto.getRandomValues` for a 64-byte base64url `code_verifier`; `crypto.subtle.digest("SHA-256", ...)` for the `code_challenge`. Small `base64url(bytes)` util.
- **State + nonce.** Random 32-byte `state`, 16-byte `nonce`. Persist alongside `verifier` in `chrome.storage.session` keyed by `state` so the redirect handler can match. Verify both on callback.
- **Authorize URL builder.** `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `nonce`, `code_challenge`, `code_challenge_method=S256`.
- **`launchWebAuthFlow` wrapper.** `browser.identity.launchWebAuthFlow({url, interactive: true})`. Parse `code` and `state` from returned URL. Verify state.
- **Token exchange.** `POST` to `${ISSUER}/token` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `code_verifier`. No `client_secret`.
- **ID token check.** Decode payload; verify `iss`, `aud === CLIENT_ID`, `nonce` match, `exp` fresh. For v1 the TLS channel to Squarelet is trust enough; if we ever need the id_token as a credential elsewhere, add JWKS signature verification via `jose`.
- **Userinfo fetch.** `GET ${ISSUER}/userinfo` with bearer token, populate `authState.user`.
- **Persistence.** Store `{access_token, refresh_token, expires_in, issued_at, id_token, user}` in `chrome.storage.local` under a single key. `restore()` reads it on SW boot and seeds `authState`.
  - Research recommends `chrome.storage.session` (cleared at browser restart) as the safer default. For Klaxon we want the user to stay signed in across restarts, so `chrome.storage.local` is the right choice — document the tradeoff and make sure we never leak tokens to content scripts or the page.
- **Refresh.** `getAccessToken()` checks `issued_at + expires_in*1000 - 30s`; if stale and a refresh token exists, `POST grant_type=refresh_token` with `client_id` and `refresh_token` (no secret). Single-flight (dedupe concurrent callers with a module-level promise). On 4xx, clear tokens and return null.
- **Logout.** Clear storage + `authState`, then call `end_session_endpoint` with `id_token_hint` + `post_logout_redirect_uri` via `launchWebAuthFlow`. Swallow close errors — local tokens are already cleared.

### 3. Background service worker

New file: `extension/src/background/index.ts`.

- On install / startup: `auth.restore()`.
- `chrome.runtime.onMessage` router:
  - `auth/login` → `auth.login()`, reply with new `authState`.
  - `auth/logout` → `auth.logout()`.
  - `auth/token` → `auth.getAccessToken()` (for content-script fetches that need a bearer).
  - `auth/state` → return current `authState` snapshot.
- On storage change, broadcast via `chrome.runtime.sendMessage` so open sidebars update.

### 4. Content script wiring

- Remove the direct `login()` import from [extension/src/content/main.svelte.ts](../extension/src/content/main.svelte.ts).
- Replace with a thin client in e.g. `extension/src/lib/auth-client.ts` that wraps `chrome.runtime.sendMessage` and exposes the same shape (`login`, `logout`, reactive state driven by `onMessage`).
- Sidebar gets a "Sign in" button that calls `authClient.login()` and renders `authState.user` when authenticated.

### 5. Tests

Co-locate Vitest tests next to `auth.svelte.ts`:

- PKCE verifier/challenge pair round-trips against a known SHA-256 vector.
- Authorize URL builder produces all required params.
- Token exchange: mock `fetch`, assert body contains `code_verifier` and no `client_secret`.
- Refresh: near-expiry path triggers refresh; concurrent `getAccessToken()` calls dedupe.
- State mismatch on redirect → rejects.
- `nonce` mismatch in id_token → rejects.

Mock `chrome.storage.local` and `browser.identity.launchWebAuthFlow` with simple in-memory shims.

### 6. Docs

Update [extension/README.md](../extension/README.md) with: required env vars, how to generate the extension `key`, how to register the redirect URI with Squarelet, and how to test the flow locally.

## Open questions

- **Which scopes beyond `openid profile email uuid organizations`** does Klaxon need for its DocumentCloud integrations? `preferences` / `bio` are available if useful.
- **Firefox redirect URI strategy.** `browser.identity.launchWebAuthFlow` works, but its redirect URI is `https://<UUID>.extensions.allizom.org/` where `<UUID>` is generated per Firefox profile on install — *not* derived from `gecko.id`. Consequences:
  - Every dev machine has a different UUID. Workaround: pin it via `about:config` → `extensions.webextensions.uuids` before first install, then register that URI alongside the Chrome one on Squarelet.
  - Every end-user has a different UUID too, so we can't simply register a fixed set for production. Options to evaluate before shipping Firefox:
    1. Intermediate redirect: register one stable URL on Squarelet (e.g. a hosted `auth/extension-callback` page) that re-redirects to `browser.identity.getRedirectURL()`. Requires hosting a tiny static page and asking Squarelet's OIDC provider to accept it.
    2. Relax redirect URI matching on Squarelet to a regex/prefix for `.extensions.allizom.org` hosts — `django-oidc-provider` does exact-string matching so this would be a small fork/patch.
    3. Ship Chrome/Edge/Brave first, add Firefox when we pick an option.

## Rollout

1. **Squarelet:** patch `ProviderInfoView` for discovery-doc fixes. Low-risk, ships independently.
2. **Squarelet:** register a `muckrock-extension` public client; add extension origins to `CORS_ORIGIN_WHITELIST` in production env.
3. **Klaxon:** land manifest + background scaffolding with no visible UI change.
4. **Klaxon:** implement `auth.svelte.ts` + tests against the registered client.
5. **Klaxon:** wire sidebar sign-in UI.
6. Manual QA on Chrome + Firefox dev builds against staging Squarelet.
7. Register production redirect URIs and enable sign-in for users.
