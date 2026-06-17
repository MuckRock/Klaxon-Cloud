# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Klaxon Cloud — a Chrome/Firefox MV3 browser extension (Svelte 5 + Vite + TypeScript) that injects a sidebar into the active page. The user hovers/clicks/drags to pick a DOM region; the extension records a CSS selector + matched text used to monitor that region for changes. Successor to the older Klaxon bookmarklet.

The repo lives at `Klaxon-Cloud/extension/`. The parent repo also contains `docs/plans/` (design docs) and may contain a symlinked `research/` dir.

## Commands

```sh
npm run dev:content  # vite build --watch — content script (src/main.svelte.ts → build/chrome/content.js)
npm run dev:service  # vite build --watch -c vite.config.background.ts — service worker (src/background.ts → build/chrome/background.js)
npm run build        # one-shot prod build for both browsers
npm run build:chrome # just the Chrome build → build/chrome/
npm run build:firefox # just the Firefox build → build/firefox/
npm run check        # svelte-check (type-check .svelte + .svelte.ts)
npm run lint         # prettier --check .
npm run format       # prettier --write .
npm test             # vitest run (happy-dom)
npm run test:watch
```

Both vite configs target one browser per invocation, selected by the `BROWSER` env var (`chrome` | `firefox`, default `chrome`), and emit into `build/<browser>/`. `npm run build` runs both browsers; the watchers (`dev:content`/`dev:service`) default to Chrome — prefix with `BROWSER=firefox` to develop against Firefox.

Dev runs as two separate vite invocations because they share `build/<browser>/` and can't both `emptyOutDir` — run them in two terminals (or whatever multiplexer you use). The service-worker config sets `emptyOutDir: false` and `copyPublicDir: false` so the content-script build is the one that owns `build/<browser>/`.

Single test: `npx vitest run src/lib/tests/oidc.test.ts` or filter by name `npx vitest run -t "pkce"`.

Loading in Chrome: `chrome://extensions` → enable Developer mode → Load unpacked → select `build/chrome/`. The action button injects the content script. The extension ID is pinned by the `"key"` in `manifest/chrome.json`, so it's stable across reloads.

## Env vars

`MUCKROCK_*` vars in `.env` are baked into the bundle at build start (`envPrefix: "MUCKROCK_"` on both vite configs). **Restart both `dev:content` and `dev:service` after editing `.env`** — Vite only reads env files at startup and will otherwise keep emitting builds with stale values. After a rebuild, also reload the extension at `chrome://extensions`. Required: `MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_CLIENT_ID`. See `.env.example`.

## Architecture

### Build shape

Two vite configs, both emitting into `build/<browser>/` with stable filenames (Chrome extensions need filenames listed in `manifest.json`, so no asset hashing and no code splitting). Each is parametrized by the `BROWSER` env var (default `chrome`):

- **`vite.config.ts`** — content script. IIFE bundle at `build/<browser>/content.js`, entry `src/main.svelte.ts`. CSS is `injected` into JS (Svelte compiler option) so styles work inside the shadow DOM the content script creates. `static/` is its `publicDir`: icons and fonts get copied verbatim. It also runs the `klaxon-manifest` plugin (a `closeBundle` hook) that writes the browser-specific `manifest.json` into the output dir.
- **`vite.config.background.ts`** — service worker. ESM bundle at `build/<browser>/background.js`, entry `src/background.ts`. `emptyOutDir: false` and `copyPublicDir: false` so it doesn't stomp on the content-script build.

#### Per-browser manifests

Chrome and Firefox disagree on a few manifest keys, and a single shared manifest makes each browser warn about the other's keys. The manifest is split under `manifest/`:

- **`manifest/base.json`** — everything shared (name, icons, permissions, `web_accessible_resources`, `manifest_version`, …).
- **`manifest/chrome.json`** — `background.service_worker` (+ `type: module`) and the Chrome-only `key` (ID pin).
- **`manifest/firefox.json`** — `background.scripts` (+ `type: module`) and the Firefox-only `browser_specific_settings.gecko`.

`scripts/manifest.mjs` exports `buildManifest(browser)`, which shallow-merges `base` + the browser overlay (the overlay supplies the whole `background` block plus its browser-only top-level keys, so no deep merge is needed). It's the single source of truth, reused by both the vite plugin and `scripts/redirect-uris.mjs`. **There is no longer a `static/manifest.json`** — edit the fragments under `manifest/` instead.

### Content script (`src/main.svelte.ts`)

Creates `<div id="klaxon-host">` on `document.body`, attaches an open shadow root, shifts `body.style.marginRight` by `SIDEBAR_WIDTH`, mounts `<App>` inside the shadow root, and on cleanup unmounts and restores the margin. Guarded by `window._klaxonInject` to prevent double-injection (and warns if the legacy bookmarklet is already running).

### Canvas (`src/lib/canvas.svelte.ts`)

The interactive picker. Owns the page-level overlay DOM (dimming, hover outline, locked-selection outline, drag rectangle, dismiss button) and an `<ApertureBar>` that walks ancestors. Listeners on `window` (mousedown/move/up + capturing click) are added/removed via `canvas.active`. `App.svelte`'s `router.onchange` toggles `canvas.active`/`canvas.editable` for the picker views (`createAlert`, `editAlert`), so picking is only live there. State is exposed as `$state` getters via `canvas.state` so Svelte components can react. Created once by `initCanvas()` in `App.svelte` and shared via the `getCanvas`/`setCanvas` context — the picker views (`CreateAlert`, `SaveAlert`, `EditAlert`) read `canvas.state.*` and call `canvas.setSelector()`/`clearSelection()` directly rather than receiving them as props.

### Selector engine (`src/lib/selector.ts`)

Pure DOM → structured-selector logic, no Svelte. Builds `StructuredSelector` (segments with id/classes/data-attrs/semantic attrs/nth-of-type) and serializes by `SpecificityLevel`. `resolveTarget` (point) and `resolveEnclosingElement` (drag rect) are the two entry points; both filter out the Klaxon host. Covered by `src/lib/tests/selector.test.ts`.

### Shared types and fixtures

- **API types** live in `src/lib/types.d.ts` — `User`, `Org`, `AddOn`, `Run`, `Event`, `Page<T>`, `APIResponse<T, E>`, etc. Most list endpoints return `Page<T>`; `Run` and `Event` reference `AddOn` as either an id or expanded object depending on `?expand=` params.
- **Fixtures** for tests live in `src/test/fixtures/` (`addons.ts`, `events.ts`, `runs.ts`) — typed sample payloads from the DocumentCloud API. Import from tests as `../../test/fixtures/...` (or `../fixtures/...` for tests in `src/test/`).

### Routing & views

The router is a class singleton in **`src/lib/router.svelte.ts`** (`export const router`), shared via the `getRouter`/`setRouter` context. There is no `Router.svelte` component.

- `router.views` is a `Partial<Record<View, Component>>` — a map from view name to a **bare Svelte component**, populated in `App.svelte`. `View` is the literal union of view names in `router.svelte.ts` — **adding a view means extending that union and registering its component in `App.svelte`**.
- **Navigation just swaps the component + props; there is no central data loading.** `router.navigate(view, props?, options?)` records a breadcrumb on the back stack, sets `current`/`props`, and fires `onchange(view)`. The router has **no `reload()`, `loading`, or `onerror`** — **each view loads its own data** via an internal `$effect` (typically keyed on `authState`). There is no `load()` export and no `ViewEntry` wrapper; props passed to `navigate` are just spread into the view.
- Back stack: `#history` is a private stack of `[view, props]`. `back()` pops and restores the previous view + props. `replace(view, props?)` swaps the current breadcrumb instead of pushing a new one — used by transient editors like `editSelection` so that saving returns to the origin without leaving the editor on the stack. `navigate` options: `restore` overrides the props recorded for the _outgoing_ view (so a view can stash state to re-populate on Back, e.g. `SaveAlert` carrying its form values into the `signIn` interstitial), and `reset` clears the whole stack (so Back can't re-run a completed flow, e.g. after an alert is saved).
- `App.svelte` renders the current view dynamically. It binds `const CurrentView = $derived(router.view)` (the `router.view` getter returns `views[current]`) and renders `<CurrentView {...router.props} />` — using a `$derived` variable (not `<router.view ... />`) is what makes the component re-mount on navigation. Don't name the local `View`: it collides with the imported `type View`, and while `svelte-check` tolerates it, the bundler errors (`npm run build` is the gate, not `check`).

### UI shell (`src/lib/components/`)

- `App.svelte` — the root. Registers `router.views`, wires `router.onchange` to `handleRouteChange` (which toggles `canvas.active`/`canvas.editable` per view and clears the selection when leaving a selection view), provides the router/toaster/canvas contexts (`setRouter`/`setToaster`/`setCanvas`), inits the canvas with `untrack`'d host/shadow refs (one-shot init), and renders `Header` + `ToastList` + the current view. There's no boot/reload wiring or loading bar at this level — views self-load (each view's `$effect` keyed on `authState` re-fetches on boot + re-login).
- `Header.svelte` — top bar with the Sign in/Sign out button and (when authenticated) the navigation between alert views. Reads `authState` directly.
- `Welcome.svelte` — wraps authenticated views, showing a sign-in CTA when `authState.status !== "authenticated"` and the view's content otherwise.
- `ToastList.svelte` — renders the toasts. The toaster itself is a class singleton in **`src/lib/toaster.svelte.ts`** (`export const toaster`), shared via `getToaster`/`setToaster`; `getToaster()` returns `{ toasts, success, error, dismiss }`. Errors are sticky; successes auto-dismiss after 5s. There is no `Toaster.svelte` component.
- `ApertureBar.svelte` — ancestor-walker UI for the picker (driven by `canvas.state`).
- `RelativeTime.svelte` — small helper for human-readable timestamps.
- Views in `src/lib/views/` (`ListAlerts` — the home view, `CreateAlert`, `SaveAlert`, `ViewAlert`, `EditAlert`, `EditSelection`, `SignIn`).

### Auth (split between SW and sidebar)

OIDC + PKCE against Squarelet, public client (no secret).

- **Service worker** (`src/background.ts`, built to `build/<browser>/background.js` via `vite.config.background.ts`) does all of: `launchWebAuthFlow`, token exchange, refresh, storage. It must — content scripts can't call `chrome.identity.launchWebAuthFlow`. Tokens persist in `chrome.storage.local` under `muckrock_auth`. Concurrent refreshes are deduped (`refreshPromise`). Listens for `auth/login | auth/logout | auth/token | auth/state` runtime messages, plus `api/fetch` for proxying API calls that need the credentialed token (so the content script doesn't see the bearer).
- **Sidebar client** (`src/lib/auth.svelte.ts`) sends those messages and mirrors the stored record into a reactive `authState: $state<{ status, user, expiresAt, error }>`. Subscribes to `chrome.storage.onChanged` for cross-tab sync (guarded — content scripts don't always see `chrome.storage` even with the permission). `restore()` runs once at content-script boot to seed state from whatever the SW already has.
- **OIDC helpers** in `src/lib/oidc.ts` (PKCE, base64url, JWT payload decode, endpoint URL builders, token-exchange / userinfo / refresh fetchers) are pure functions imported by both the SW and `src/lib/tests/oidc.test.ts`.
- **Redirect URI**: the SW logs `chrome.identity.getRedirectURL()` on boot. Squarelet's `django-oidc-provider` does exact-string matching, so this URL (with trailing slash) must be registered verbatim on the OIDC client. **Both browsers are cross-machine stable** because both derive the redirect from the (pinned) extension ID — so two URLs are registered on the OIDC client, one per browser, and both are recomputable offline:
  - **Chrome**: `https://noigegfnnlepflfmiajbpdhpgjgmiikc.chromiumapp.org/`. The ID is pinned by the `"key"` in `manifest/chrome.json` (it's the SHA-256-derived hash of the key, mapped to a–p).
  - **Firefox**: `https://42386841672e9751ac81498187b4242b2e7d8fde.extensions.allizom.org/`. The subdomain is `SHA-1(extension.id)` in hex — `extension.id` is `browser_specific_settings.gecko.id` (`klaxon-cloud@muckrock.com`). Verified against Firefox source: `child/ext-identity.js` does `computeHash(extension.id)` with `CryptoHash("sha1")`, then `https://${hash}.${redirectDomain}/`, where `redirectDomain` is the `extensions.webextensions.identity.redirectDomain` pref (default `extensions.allizom.org`).
  - Caveats: the Firefox URL is only stable **because `gecko.id` is set** — without it, a temporary install gets a random ID and thus a different hash (the source of the "different per machine" reports in old threads; it's _not_ the random `moz-extension://<uuid>` internal UUID, which is unrelated to the identity redirect). Since Firefox 75 you must use the `getRedirectURL()` value as the OAuth `redirect_uri` — you can't substitute a hosted callback page. Confirmed unchanged as of the current source (checked against Firefox 151).
- **Two token tiers** (the OIDC→JWT exchange is implemented; this is the current shape, not a plan): the stored record is `{ oidc, jwt, userinfo }`.
  - `oidc` — the Squarelet OIDC tokens from the PKCE flow (`/openid/token`).
  - `jwt` — a **DocumentCloud JWT** minted by `POST /api/jwt/` on Squarelet ([PR #675](https://github.com/MuckRock/squarelet/pull/675)) from the OIDC access token (`exchangeOidcForJwt`, body `{ oidc_token }`). **DC API calls use this JWT**, not the OIDC token — `accessToken()` returns `jwt.access_token`.
  - Refresh is two-tiered (`refreshTokens` in `background.ts`): first refresh the JWT directly via `POST /api/refresh/` (`refreshJwt`, body `{ refresh }`); on failure, refresh the OIDC token and re-mint the JWT + re-fetch userinfo; if that also fails, sign out. `isValidStoredAuth` drops legacy `{ auth, userinfo }` records so only the three-slot shape is seen. Original plan at [`../docs/plans/auth-jwt-exchange.md`](../docs/plans/auth-jwt-exchange.md).

## Conventions

- **Svelte 5 runes** throughout (`$state`, `$derived`, `$effect`, `$props`). Reactive non-component state lives in `*.svelte.ts` files (e.g. `auth.svelte.ts`, `canvas.svelte.ts`) — the `.svelte.ts` extension is what enables runes outside `.svelte` files.
- **Reactive state in `*.svelte.ts`, shared via context**, not stores. `router` (`router.svelte.ts`) and `toaster` (`toaster.svelte.ts`) export a module singleton plus a `getX`/`setX` context pair; `canvas` (`canvas.svelte.ts`) is instead built per-mount by `initCanvas()` (it needs the host/shadow refs) and shared via `getCanvas`/`setCanvas`. In all three, `App.svelte` calls `setX` once so descendants resolve `getX()`; App itself (and non-component code) holds the instance directly rather than via context.
- TS is strict throughout. The service worker and OIDC helpers are TypeScript (`src/background.ts`, `src/lib/oidc.ts`); `static/` now holds only the icons and fonts (the manifest fragments live under `manifest/`).
- Tests use `happy-dom`, not `jsdom`.
