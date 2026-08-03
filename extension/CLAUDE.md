# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Klaxon Cloud — a Chrome/Firefox MV3 browser extension (Svelte 5 + Vite + TypeScript). The sidebar UI runs in the **browser-native side panel** (Chrome `sidePanel` / Firefox `sidebarAction`); to pick a DOM region it injects a **Canvas content script** into the active page, where the user hovers/clicks/drags to record a CSS selector + matched text used to monitor that region for changes. Successor to the older Klaxon bookmarklet.

The repo lives at `Klaxon-Cloud/extension/`. The parent repo also contains `docs/plans/` (design docs) and may contain a symlinked `research/` dir.

## Commands

```sh
npm run dev          # clean once, then run all three watch builds in parallel (npm-run-all)
npm run dev:page     # vite build --watch -c vite/page.config.ts — Canvas content script (src/page.svelte.ts → build/chrome/page.js)
npm run dev:sidepanel # vite build --watch -c vite/sidepanel.config.ts — side panel (sidepanel.html + src/sidepanel.ts → build/chrome/)
npm run dev:service  # vite build --watch -c vite/background.config.ts — service worker (src/background.ts → build/chrome/background.js)
npm run build        # one-shot prod build for both browsers
npm run build:chrome # just the Chrome build → build/chrome/
npm run build:firefox # just the Firefox build → build/firefox/
npm run check        # svelte-check (type-check .svelte + .svelte.ts)
npm run lint         # prettier --check .
npm run format       # prettier --write .
npm test             # vitest run (happy-dom; vitest.config.ts)
npm run test:watch
npm run bump -- minor # bump the store version in manifest/base.json (also: major | patch | x.y.z, --dry-run)
```

All build configs live under `vite/` and target one browser per invocation, selected by the `BROWSER` env var (`chrome` | `firefox`, default `chrome`), emitting into `build/<browser>/`. `npm run build` runs both browsers; the watchers default to Chrome — prefix with `BROWSER=firefox` to develop against Firefox.

`npm run dev` runs all three watch builds in parallel via `npm-run-all`. They share `build/<browser>/` and none of them may own `emptyOutDir` (parallel watchers would race), so `npm run clean` (`scripts/clean.mjs`) empties `build/<browser>/` **once** up front; every build config sets `emptyOutDir: false`. The `page` config owns `publicDir: "static"` (icons, fonts) and writes the per-browser `manifest.json` (the `klaxon-manifest` plugin); the sidepanel and background configs set `copyPublicDir: false`.

Single test: `npx vitest run src/lib/tests/oidc.test.ts` or filter by name `npx vitest run -t "pkce"`.

Loading in Chrome: `chrome://extensions` → enable Developer mode → Load unpacked → select `build/chrome/`. The action button opens the side panel; the Canvas content script is injected on demand. The extension ID is pinned by the `"key"` in `manifest/chrome.json`, so it's stable across reloads. Loading in Firefox: `about:debugging` → Load Temporary Add-on → `build/firefox/manifest.json`; the toolbar button toggles the native sidebar.

## Env vars

`MUCKROCK_*` vars in `.env` are baked into the bundle at build start (`envPrefix: "MUCKROCK_"` on every config). **Restart the dev watchers after editing `.env`** — Vite only reads env files at startup and will otherwise keep emitting builds with stale values. After a rebuild, also reload the extension at `chrome://extensions`. Required: `MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_CLIENT_ID`. See `.env.example`.

## Architecture

### Build shape

Three vite configs under `vite/`, all emitting into `build/<browser>/`, plus `vitest.config.ts` at the root (so no build config has to double as the default config; vitest auto-resolves it). Each build config is parametrized by the `BROWSER` env var (default `chrome`). The page and worker bundles use stable filenames (Chrome needs the names listed in `manifest.json`, so no hashing/splitting); the side panel is a normal HTML page, so its JS/CSS may be hashed (only `sidepanel.html` is referenced by the manifest).

- **`vite/page.config.ts`** — Canvas content script. IIFE bundle at `build/<browser>/page.js`, entry `src/page.svelte.ts`. CSS is `injected` into JS (Svelte compiler option) so styles work inside the shadow DOM. `static/` is its `publicDir` (icons, fonts), and it runs two `closeBundle` plugins: `klaxon-manifest` (writes the browser-specific `manifest.json`) and `klaxon-dev-assets` (the dev-only asset overlay, below).
- **`vite/sidepanel.config.ts`** — side panel page. Entry `sidepanel.html` (which loads `src/sidepanel.ts`) → `sidepanel.html` + hashed JS/CSS. Normal page (CSS extracted, **not** injected). `emptyOutDir: false`, `copyPublicDir: false`.
- **`vite/background.config.ts`** — service worker. ESM bundle at `build/<browser>/background.js`, entry `src/background.ts`. `emptyOutDir: false`, `copyPublicDir: false`.

No config owns `emptyOutDir` (parallel `npm run dev` watchers would race); `npm run clean` (`scripts/clean.mjs`) empties `build/<browser>/` once up front.

#### Per-browser manifests

Chrome and Firefox disagree on a few manifest keys (and on sidebar APIs), and a single shared manifest makes each browser warn about the other's keys. The manifest is split under `manifest/`:

- **`manifest/base.json`** — everything shared (name, icons, `web_accessible_resources`, `manifest_version`, and the shared `permissions` including `tabs`, …).
- **`manifest/chrome.json`** — `background.service_worker` (+ `type: module`), the Chrome-only `side_panel` key and `sidePanel` permission, and the Chrome-only `key` (ID pin).
- **`manifest/firefox.json`** — `background.scripts` (+ `type: module`), the Firefox-only `sidebar_action` key, and `browser_specific_settings.gecko`.

`scripts/manifest.mjs` exports `buildManifest(browser)`, which shallow-merges `base` + the browser overlay **but unions the `permissions` arrays** (so an overlay can add a browser-only permission like `sidePanel` without dropping the shared ones). It's the single source of truth, reused by the vite plugin, `scripts/clean.mjs`, and `scripts/redirect-uris.mjs`. **There is no `static/manifest.json`** — edit the fragments under `manifest/`.

#### Dev builds are labelled and re-skinned (`DEV_BUILD`)

A dev build loads unpacked alongside the store-installed extension, and with the same name and icon there's no telling which toolbar button or `chrome://extensions` row is which. `DEV_BUILD=true` — set by the `dev:page` script only, so `npm run dev` gets it and `build:*` and the e2e build never do — switches on both halves of the fix:

- `buildManifest`'s `dev` option appends `DEV_SUFFIX` (`" (dev)"`) to `name`, `action.default_title`, and Firefox's `sidebar_action.default_title`.
- The `klaxon-dev-assets` plugin copies `static-dev/` over the output **after** vite's `publicDir` copy, so same-named files there (`icon-16/48/128.png`) replace the shared icons without any manifest path changing. Ordering is safe by construction: vite copies `publicDir` in `renderStart` (and re-copies on every watch rebuild, since its `watchChange` resets the guard), and this runs in `closeBundle`. The dir is optional and a partial overlay falls through to `static/`; `README.md` and dotfiles are filtered out so they can't reach the build.

Because prod builds skip the overlay entirely, nothing in `static-dev/` can leak into a store zip — but note its `*.png` are LFS-tracked like `static/`'s, so an LFS-less checkout overlays pointer text (see the LFS section below).

#### Versioning

`version` lives **only** in `manifest/base.json` (neither overlay sets it, and the `version` fields in the `package.json`s are unrelated npm workspace boilerplate). Bump it with `npm run bump -- <major|minor|patch|x.y.z>` (`scripts/version.mjs`); `--dry-run` prints without writing.

Store versions are **not semver**: Chrome accepts 1–4 dot-separated integers in 0–65535 with no leading zeros, so the published `1.1` is a valid two-part version. The bumps are semver-_shaped_ — `minor` gives `1.1 → 1.2`, `patch` gives `1.1 → 1.1.1` (appending a third part), `major` gives `1.1 → 2.0`. The script validates the range/leading-zero rules and refuses any bump that isn't a strict increase, since both stores reject an upload whose version doesn't sort above the published one.

#### Icons and fonts are Git LFS objects

`static/*.png` and `static/fonts/*.woff2` are tracked by Git LFS (see the repo-root `.gitattributes`). **Any checkout that doesn't fetch LFS objects gets ~130-byte pointer text files under those names instead** — and because vite just copies `publicDir` through, the build succeeds and the zip looks complete while every icon and font in it is unreadable. This shipped once: the Chrome Web Store rejected the upload with "The icon file icon-128.png could not be processed." `.github/workflows/package.yml` therefore checks out with `lfs: true` and has a guard step that greps the build output for the LFS pointer signature and fails the job if it finds one. Check `file build/chrome/icon-128.png` before any manual upload — it must say `PNG image data`, not `ASCII text`.

### Two realms, joined by a port

The sidebar UI and the picker run in **separate JS realms** that can't import each other; they communicate over a `chrome.tabs` port.

- **Side panel** (`src/sidepanel.ts` + `sidepanel.html`) — the panel realm. An extension-origin page hosting `<App>`; persists across navigations, has full `chrome.*`. Mounts `App` with `{ canvas }` = a `CanvasClient`.
- **Page content script** (`src/page.svelte.ts`, → `page.js`) — the page realm. Replaces the old `src/main.svelte.ts`. Injected on demand (via the worker's `canvas/ensure`); creates `<div id="klaxon-host">` + an open shadow root, calls `initCanvas(host, shadow, 0)` (no margin shift), and for each connecting panel port streams engine state and handles `setActive`/`setEditable`/`clear`/`setSelector`/`getPage`. On disconnect it sets `canvas.active = false` and `canvas.visible = false` — **without** clearing the selection — so a tab's locked selection survives a tab switch / panel close. Guarded by `window._klaxonInject`.

### Canvas engine (`src/lib/canvas.svelte.ts`)

The interactive picker engine, run **in the page** by `src/page.svelte.ts`. Owns the page-level overlay DOM (dimming, hover outline, locked-selection outline, drag rectangle, dismiss button) and an `<ApertureBar>`. Listeners on `window` are added/removed via `canvas.active`; `canvas.visible` separately controls whether overlays are drawn (the panel sets it false on disconnect to hide — but keep — a locked selection, true on reconnect to restore it; do **not** conflate it with `active`, which can be false on `saveAlert` while the selection stays visible). State is exposed as `$state` getters via `canvas.state`. `initCanvas()` returns the engine; **the `getCanvas`/`setCanvas` context lives in `canvas-client.svelte.ts`, not here.**

### Canvas proxy (`src/lib/canvas-client.svelte.ts`)

`CanvasClient` is the **panel-side** handle to the page engine. It mirrors the engine's streamed state into `$state` and proxies actions over the port, presenting the same `canvas`-shaped object the views consume via `getCanvas`/`setCanvas` (created once in `src/sidepanel.ts`, shared by `App.svelte`). The one ergonomic change vs. the old in-process engine: **`setSelector` is `async`** (it round-trips to the page; the page side also scrolls the match into view). Extra reactive fields beyond the engine: `url` (canonical, or raw tab URL on restricted pages), `origin` (the alert-list domain filter), `title` (SaveAlert default), and `watchable` (true for an ordinary `http(s)` page; false on `chrome://`, the web store, PDFs, `file://`).

**`url` is what the page _claims_ is canonical, so don't treat it as the tab's identity.** It comes from the page's `og:url` / `link[rel=canonical]` (`src/lib/url.ts`, absolutized against the document since #94), and a page is free to advertise a canonical naming a different document — Socrata does. `navigateTab`'s "already there?" guard therefore asks `chrome.tabs.get` for the tab's real URL; `url` exists to seed SaveAlert's site field. Note `origin` is derived from the raw tab URL, so the two can legitimately disagree.

**Page access is per-origin and runtime-granted, not broad.** The manifest declares `optional_host_permissions` (the broad `*://*/*` page access stays optional, never install-time), so the picker can only be injected after the user grants the page's origin. `requestWatch(origin?)` wraps `chrome.permissions.request` and **must be called from a user-gesture handler** (the "Create alert" button and the alert-list link both call it before navigating); granted origins persist, so it prompts at most once per site. This is what lets Klaxon avoid the Web Store's broad-host in-depth review — see [`../plans/optional-host-permissions.md`](../plans/optional-host-permissions.md).

**Backend hosts are an exception: they're install-time `host_permissions`.** The service worker fetches the Squarelet OIDC/JWT endpoints and the DocumentCloud API directly, and a host permission matching the request URL exempts that cross-origin fetch from CORS — required because Squarelet's `/openid/token` sends no `Access-Control-Allow-Origin`. These are derived from `MUCKROCK_ACCOUNTS_HOST` + `MUCKROCK_DOCUMENTCLOUD_API` **at build time** by `vite/page.config.ts` (via `loadEnv`) and merged into the manifest by `buildManifest`'s `hosts` option, so each environment's build requests only its own backend. They're narrow, named hosts — they don't trigger the broad-host review the optional `*://*/*` page access would. (Before the host-permissions narrowing these fetches rode the old broad `host_permissions: https://*/*` and were silently CORS-exempt; that's why the token exchange never needed a CORS allowlist on Squarelet.)

**Two modes** (`pinned`):

- _Tracking_ (default, on `listAlerts`): follows the active tab (`tabs.onActivated` + a completed top-level `onUpdated`) and mirrors its `url`/`origin`/`watchable` via the `tabs` permission — **without injecting**. The picker is injected only when the user explicitly starts a flow (see Pinned), so tracking needs no on-page access. `setSelector`/`getPage` and the port don't exist until then.
- _Pinned_ (during a selection flow): on entry the canvas injects `page.js` into the pinned tab and opens the port (host access was granted by the `requestWatch` in the originating gesture); tab switches are then ignored, so the port and its overlay stay on the tab the flow began on. Setting `pinned = false` tears the port down and resumes metadata-only tracking of the active tab. `App.svelte`'s `handleRouteChange` sets `canvas.pinned = SELECTION_VIEWS.has(view)` — so the panel itself is **global/stable**, never re-routed by a tab switch; only the canvas is tab-aware.

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
- **The panel is global, not per-tab.** Switching browser tabs never changes the router view/props — only `canvas` is tab-aware (see Canvas proxy modes above). `SaveAlert` carries its form values through the `signIn` interstitial via the `restore` navigate option (Back-from-signIn re-seeds the form); there's no per-tab snapshotting.
- `App.svelte` renders the current view dynamically. It binds `const CurrentView = $derived(router.view)` (the `router.view` getter returns `views[current]`) and renders `<CurrentView {...router.props} />` — using a `$derived` variable (not `<router.view ... />`) is what makes the component re-mount on navigation. Don't name the local `View`: it collides with the imported `type View`, and while `svelte-check` tolerates it, the bundler errors (`npm run build` is the gate, not `check`).

### UI shell (`src/lib/components/`)

- `App.svelte` — the root. Receives `{ canvas }` (a `CanvasClient`) from `src/sidepanel.ts`, registers `router.views`, wires `router.onchange` to `handleRouteChange` (which per view toggles `canvas.active`/`canvas.editable`, clears the selection when leaving a selection view, and sets `canvas.pinned` for selection flows), provides the router/toaster/canvas contexts (`setRouter`/`setToaster`/`setCanvas` — the `canvas` read is `untrack`'d as a stable prop), and renders `Header` + `ToastList` + the current view. There's no boot/reload wiring — views self-load (each view's `$effect` keyed on `authState` re-fetches on boot + re-login).
- `Header.svelte` — top bar with the Sign in/Sign out button and (when authenticated) the navigation between alert views. Reads `authState` directly. No close button — the browser owns the panel chrome.
- `Welcome.svelte` — wraps authenticated views, showing a sign-in CTA when `authState.status !== "authenticated"` and the view's content otherwise.
- `ToastList.svelte` — renders the toasts. The toaster itself is a class singleton in **`src/lib/toaster.svelte.ts`** (`export const toaster`), shared via `getToaster`/`setToaster`; `getToaster()` returns `{ toasts, success, error, dismiss }`. Errors are sticky; successes auto-dismiss after 5s. There is no `Toaster.svelte` component.
- `ApertureBar.svelte` — ancestor-walker UI for the picker (driven by `canvas.state`).
- `RelativeTime.svelte` — small helper for human-readable timestamps.
- Views in `src/lib/views/` (`ListAlerts` — the home view, `CreateAlert`, `SaveAlert`, `ViewAlert`, `EditAlert`, `EditSelection`, `SignIn`).

### Auth (split between SW and panel)

OIDC + PKCE against Squarelet, public client (no secret).

- **Service worker** (`src/background.ts`, built to `build/<browser>/background.js` via `vite/background.config.ts`) does all of: `launchWebAuthFlow`, token exchange, refresh, storage. (The panel is an extension page and could call `chrome.identity` directly, but auth stays in the SW alongside token storage and the fetch proxy.) Tokens persist in `chrome.storage.local` under `muckrock_auth`. Concurrent refreshes are deduped (`refreshPromise`). Listens for `auth/login | auth/logout | auth/token | auth/state` runtime messages, plus `api/fetch` for proxying API calls that need the credentialed token (so the bearer stays out of the panel/page), and `canvas/ensure` for injecting `page.js`.
- **Panel client** (`src/lib/auth.svelte.ts`) sends those messages and mirrors the stored record into a reactive `authState: $state<{ status, user, expiresAt, error }>`. Subscribes to `chrome.storage.onChanged` for cross-context sync. `restore()` runs once at panel boot to seed state from whatever the SW already has.
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
- **Reactive state in `*.svelte.ts`, shared via context**, not stores. `router` (`router.svelte.ts`) and `toaster` (`toaster.svelte.ts`) export a module singleton plus a `getX`/`setX` context pair. The picker is split across realms: the engine `canvas.svelte.ts` (`initCanvas()`, run in the page by `page.svelte.ts`) has **no** context, while the panel-side `CanvasClient` (`canvas-client.svelte.ts`, `initCanvasClient()` in `sidepanel.ts`) owns the `getCanvas`/`setCanvas` pair the views resolve. `App.svelte` calls each `setX` once so descendants resolve `getX()`.
- TS is strict throughout. The service worker and OIDC helpers are TypeScript (`src/background.ts`, `src/lib/oidc.ts`); `static/` now holds only the icons and fonts (the manifest fragments live under `manifest/`).
- Tests use `happy-dom`, not `jsdom`.
