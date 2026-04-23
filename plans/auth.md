# Browser extension OAuth (Squarelet)

## Goal

Sign the user into Squarelet from the Klaxon Cloud browser extension using OIDC authorization code + PKCE, with reactive state in the sidebar and silent token refresh across sessions.

## Status

**Shipped in [PR #14](https://github.com/MuckRock/Klaxon-Cloud/pull/14):** Chrome MV3 sign-in works end-to-end against `dev.squarelet.com` with a public client. Tokens persist in `chrome.storage.local`, refresh silently, and survive browser restarts. Sidebar has a Sign in/Sign out UI driven by a reactive `$state` store. 11 new vitest cases cover the PKCE/URL/endpoint helpers.

**Not yet done:**
- Squarelet-side discovery-document patch (recommended, optional).
- Production redirect URIs + CORS allowlist.
- Firefox redirect URI strategy.
- JWKS signature verification of the `id_token` (punted — TLS trust is enough for v1).

## Research summary

Research in [research/squarelet-oauth-extension/](../research/squarelet-oauth-extension/) confirmed that **Squarelet's OIDC server already supports the flow we need.** Squarelet pins `django-oidc-provider==0.9.0`, which implements public clients + PKCE (`S256` and `plain`) natively:

- `oidc_provider/models.py` — `Client.client_type` includes both `"confidential"` and `"public"`.
- `oidc_provider/lib/endpoints/token.py` L56–63 — `client_secret` is only validated for confidential clients; a public client can exchange a code with no secret.
- `oidc_provider/lib/endpoints/token.py` L85–103 — PKCE `S256`/`plain` verification is implemented. If `code_challenge` was set at authorize time, the token endpoint requires `code_verifier`.
- `oidc_provider/lib/endpoints/authorize.py` L88–89, L138–153 — authorize endpoint reads and persists `code_challenge`/`code_challenge_method`.
- `oidc_provider/lib/endpoints/authorize.py` L103 — redirect URI is exact-string match, which is exactly what `chrome.identity.launchWebAuthFlow`'s fixed redirect URL needs.

Squarelet's own `squarelet/oidc/views.py` only overrides `TokenEndpoint.create_code_response_dic` (to swap in SimpleJWT tokens); it inherits `validate_params`, so public-client + PKCE behavior is preserved. **No Squarelet code changes were needed for sign-in to work.**

## Squarelet-side changes

### 1. Register a public OIDC client (done for dev)

A public client is already registered on `dev.squarelet.com` (client ID `402273`). Before production can ship, repeat on the production Squarelet:

- `client_type = "public"`
- `client_id` = stable identifier (e.g. `muckrock-extension`)
- `client_secret` empty (won't be checked for public clients)
- `response_types = ["code"]`
- `redirect_uris`: one per target
  - Chrome/Edge/Brave: `https://<CHROME_EXT_ID>.chromiumapp.org/` — trailing slash required; django-oidc-provider does exact-string matching
  - Firefox: `https://<ADDON_UUID>.extensions.allizom.org/` — per-profile UUID, see open questions
  - Any dev/staging variants
- `post_logout_redirect_uris`: same set
- `scope = "openid profile email uuid organizations"` (+ `preferences`, `bio` if needed)

### 2. CORS on production (blocking for production)

The extension fetches `/openid/token` and `/openid/userinfo` directly from a `chrome-extension://` / `moz-extension://` origin. Dev works because we've wired our dev extension into whatever `CORS_ORIGIN_WHITELIST` is already in use. For production, add:

- `chrome-extension://<CHROME_EXT_ID>`
- `moz-extension://<FIREFOX_ADDON_UUID>` (per-install — consider a scoped regex instead)

Squarelet uses `django-cors-headers` with an env-driven `CORS_ORIGIN_WHITELIST` and `CORS_ALLOW_CREDENTIALS = True`. No code change; production config only.

### 3. Fix the discovery document (recommended, not blocking)

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

Wire it in `config/urls.py` before the stock `include("oidc_provider.urls")`. Our extension uses hand-rolled OIDC logic so it works without this patch, but it's cheap hardening for every future client.

### Nice-to-haves (not blocking)

- **Refresh-token reuse detection.** The current token endpoint rotates refresh tokens on use (deletes the old one) but doesn't revoke the whole token family when a used refresh is replayed. Standard hardening for public clients.
- **Disable ROPC** (`OIDC_GRANT_TYPE_PASSWORD_ENABLE = False` — currently `True`). OAuth 2.1 removes it; larger attack surface for no current gain.
- **Introspection** (`/openid/introspect`). Public clients can't meaningfully call it without a secret. Leave scoped to confidential clients.

## Architecture (as built)

```
content script (main.svelte.ts)
  └─ auth.svelte.ts (reactive $state + SW message client)
       └─ chrome.runtime.sendMessage ──▶ background SW (static/background.js)
                                          ├─ launchWebAuthFlow
                                          ├─ POST /openid/token (PKCE)
                                          ├─ GET /openid/userinfo
                                          ├─ refresh (single-flight dedupe)
                                          └─ chrome.storage.local
```

Split that differs from the original plan:

- **Service worker stays hand-written in `static/`**, not built through vite. Vite's IIFE output (required for the content script injected via `chrome.scripting.executeScript`) can't handle multiple entries, and we didn't want to split the build. Since the SW doesn't need Svelte runes, plain JS is fine.
- **Pure OIDC/PKCE helpers** live in `static/lib/oidc.js` as an ES module so the SW imports them at runtime (`manifest.background.type: "module"`) *and* vitest imports them via relative path from `src/content/tests/oidc.test.ts`. Single source of truth, no duplication.
- **`auth.svelte.ts`** is the UI-side reactive client only. It sends messages to the SW and mirrors the stored auth record into `authState` (`$state` rune). Listens to `chrome.storage.onChanged` for cross-tab sync, guarded in case the API isn't available.

## Files touched

- [extension/static/manifest.json](../extension/static/manifest.json) — `"identity"` + `"storage"` permissions, `"type": "module"` on the background entry, `"key"` field (stable extension ID), `browser_specific_settings.gecko.id` for Firefox.
- [extension/static/background.js](../extension/static/background.js) — message router (`auth/login`, `auth/logout`, `auth/token`, `auth/state`), full PKCE flow, refresh with single-flight dedupe, end-session on logout. Logs `chrome.identity.getRedirectURL()` on boot.
- [extension/static/lib/oidc.js](../extension/static/lib/oidc.js) — pure helpers: `base64UrlEncode`, `randomBase64Url`, `sha256`, `pkceChallenge`, `decodeJwtPayload`, `endpoints`, `buildAuthorizeUrl`. JSDoc-typed for `checkJs`.
- [extension/src/lib/auth.svelte.ts](../extension/src/lib/auth.svelte.ts) — reactive `authState`, `login()`, `logout()`, `getAccessToken()`, `restore()`. Reads `MUCKROCK_*` from `import.meta.env`. Guarded `chrome.storage.onChanged` listener for cross-tab sync.
- [extension/src/content/main.svelte.ts](../extension/src/content/main.svelte.ts) — calls `restore()` on inject so the sidebar seeds from existing tokens.
- [extension/src/content/Sidebar.svelte](../extension/src/content/Sidebar.svelte) — sign-in/out UI, renders `authState.user`.
- [extension/src/content/tests/oidc.test.ts](../extension/src/content/tests/oidc.test.ts) — 11 cases; RFC 7636 PKCE vector, SHA-256 empty-string vector, URL builder, endpoint derivation, JWT decode, no-client-secret assertion.
- [extension/tsconfig.json](../extension/tsconfig.json) — `"noEmit": true` (vite handles build), `"chrome"` types.
- [extension/.env.example](../extension/.env.example), [extension/README.md](../extension/README.md) — setup + redirect URI registration docs.

## Endpoints (per deployment)

Derived from `${MUCKROCK_ACCOUNTS_HOST}openid/*` at runtime:

- Authorize, Token, Userinfo, End-session, JWKS

No well-known fetch — issuer is fixed per deployment.

## Lessons learned during build

- **Env vars are baked at build start.** `vite build --watch` doesn't re-read `.env` on subsequent rebuilds — you have to restart `npm run dev` after editing `.env`. Documented in [extension/README.md](../extension/README.md).
- **Extension permission changes require an extension reload.** Toggling `chrome.storage` / `identity` in the manifest doesn't take effect on the content script until you reload the unpacked extension in `chrome://extensions`.
- **`chrome.storage` isn't universally available in content scripts** even with the `storage` permission — we guard the `onChanged` listener so a failure there doesn't break the sidebar.
- **Redirect URI matching is exact-string.** Trailing slash, whitespace, case, and the current extension ID all have to match what's on the Squarelet client.

## Open questions

- **Which scopes beyond `openid profile email uuid organizations`** does Klaxon need for its DocumentCloud integrations? `preferences` / `bio` are available if useful.
- **Firefox redirect URI strategy.** `browser.identity.launchWebAuthFlow` works, but its redirect URI is `https://<UUID>.extensions.allizom.org/` where `<UUID>` is generated per Firefox profile on install — *not* derived from `gecko.id`. Consequences:
  - Every dev machine has a different UUID. Workaround: pin it via `about:config` → `extensions.webextensions.uuids` before first install, then register that URI alongside the Chrome one on Squarelet.
  - Every end-user has a different UUID too, so we can't simply register a fixed set for production. Options to evaluate before shipping Firefox:
    1. Intermediate redirect: register one stable URL on Squarelet (e.g. a hosted `auth/extension-callback` page) that re-redirects to `browser.identity.getRedirectURL()`. Requires hosting a tiny static page and asking Squarelet's OIDC provider to accept it.
    2. Relax redirect URI matching on Squarelet to a regex/prefix for `.extensions.allizom.org` hosts — `django-oidc-provider` does exact-string matching so this would be a small fork/patch.
    3. Ship Chrome/Edge/Brave first, add Firefox when we pick an option.
- **Refresh-before-expiry timer.** Current implementation refreshes lazily on the next `getAccessToken()` after the 30s-before-expiry threshold. A background timer that refreshes proactively could avoid a first-request delay, but adds complexity (timers in MV3 SWs need `chrome.alarms`). Defer unless a UX issue appears.
- **Linter config is broken.** `eslint.config.js` imports a missing `svelte.config.js`; separate fix, not touched here.

## Rollout

1. ✅ **Klaxon:** manifest scaffolding, SW, `auth.svelte.ts`, sidebar UI, tests — shipped in PR #14, working against `dev.squarelet.com`.
2. **Squarelet:** patch `ProviderInfoView` for discovery-doc fixes. Low-risk, ships independently.
3. **Squarelet:** register a production `muckrock-extension` public client; add extension origin to `CORS_ORIGIN_WHITELIST` in production env.
4. **Klaxon:** update `.env` / build against production Squarelet; verify flow.
5. **Firefox:** pick a redirect-URI strategy from the open questions, implement, register URIs.
6. Manual QA on Chrome + Firefox builds against production Squarelet.
7. Submit to Chrome Web Store + Firefox AMO.
