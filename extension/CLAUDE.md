# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Klaxon Cloud — a Chrome/Firefox MV3 browser extension (Svelte 5 + Vite + TypeScript). The sidebar UI renders in a **native browser side panel** (Chrome `sidePanel` / Firefox `sidebarAction`); a separate **content-script picker** is injected into the active page on demand so the user can hover/click/drag to pick a DOM region. The extension records a CSS selector + matched text used to monitor that region for changes. Successor to the older Klaxon bookmarklet.

The repo lives at `Klaxon-Cloud/extension/`. The parent repo also contains `plans/` (design docs) and may contain a symlinked `research/` dir.

## Commands

```sh
npm run dev            # clean + run all three watch builds in parallel (npm-run-all)
npm run dev:content    # vite build --watch -c vite.config.content.ts — picker content script (src/picker.svelte.ts → build/content.js)
npm run dev:sidepanel  # vite build --watch -c vite.config.sidepanel.ts — side panel page (sidepanel.html → build/sidepanel.html)
npm run dev:service    # vite build --watch -c vite.config.background.ts — service worker (src/background.ts → build/background.js)
npm run build          # clean + one-shot prod build of ALL THREE bundles into build/
npm run clean          # rm -rf build/
npm run check          # svelte-check (type-check .svelte + .svelte.ts)
npm run lint           # prettier --check .
npm run format         # prettier --write .
npm test               # vitest run (happy-dom; vitest.config.ts)
npm run test:watch
```

`npm run dev` (via `npm-run-all`'s `run-p`) cleans `build/` once, then runs the three watch builds in parallel. They share `build/` and **none** of them empties it — that's the up-front `clean` step's job. (All three set `emptyOutDir: false`; otherwise a parallel start would race, with one config wiping another's first output.) You can still run the three `dev:*` scripts in separate terminals if you prefer, but run `npm run clean` first.

Single test: `npx vitest run src/lib/tests/oidc.test.ts` or filter by name `npx vitest run -t "pkce"`.

Loading in Chrome: `chrome://extensions` → enable Developer mode → Load unpacked → select `build/`. Clicking the action button opens the side panel (`sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`); the picker content script is injected lazily when the panel asks. The extension ID is pinned by the `"key"` in `static/manifest.json`, so it's stable across reloads.

## Env vars

`MUCKROCK_*` vars in `.env` are baked into the bundle at build start (`envPrefix: "MUCKROCK_"` on all three vite configs). **Restart `dev:content`, `dev:sidepanel`, and `dev:service` after editing `.env`** — Vite only reads env files at startup and will otherwise keep emitting builds with stale values. After a rebuild, also reload the extension at `chrome://extensions`. Required: `MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_CLIENT_ID`. See `.env.example`.

## Architecture

### Build shape

Three build configs (plus `vitest.config.ts` for tests), all emitting into `build/`. The content script and service worker use stable filenames (Chrome extensions need filenames listed in `manifest.json`, so no asset hashing / code splitting for those); the side-panel page is a normal HTML build whose hashed assets are referenced by the generated `sidepanel.html`. None empties `build/` — the `clean` npm script does that once before any build runs:

- **`vite.config.content.ts`** — picker content script. IIFE bundle at `build/content.js`, entry `src/picker.svelte.ts`. CSS is `injected` into JS (Svelte compiler option) so the picker's overlay/`ApertureBar` styles work inside the shadow DOM it creates. `static/` is its `publicDir`: `manifest.json` and icons get copied to `build/` verbatim. `emptyOutDir: false`.
- **`vite.config.sidepanel.ts`** — side panel page. HTML entry `sidepanel.html` (→ `build/sidepanel.html` + `build/assets/*`), mounts `<App>` via `src/sidepanel.ts`. Plain `svelte()` (CSS extracted to a linked file — no shadow DOM here). `emptyOutDir: false`, `copyPublicDir: false`.
- **`vite.config.background.ts`** — service worker. ESM bundle at `build/background.js`, entry `src/background.ts`. `emptyOutDir: false` and `copyPublicDir: false`.

### Panel ↔ picker split

The sidebar UI and the element picker live in **two different contexts** and talk over messaging:

- **Side panel** (`src/sidepanel.ts` → `<App>`) — an extension-origin page with full `chrome.*` access. It persists across page navigations and tab switches. Mounts `<App>` and provides a `PickerClient` (below) as the `canvas` context.
- **Picker content script** (`src/picker.svelte.ts`) — injected on demand by the SW (`picker/ensure`). Creates `<div id="klaxon-host">` + an open shadow root, mounts the canvas overlays/`ApertureBar` there. No body-margin shift (the native panel takes browser chrome space; the page reflows on its own). Guarded by `window._klaxonInject`. Per panel connection it opens a `chrome.runtime.onConnect` port (name `klaxon-picker`): streams `canvas.state` out as `state` messages and accepts `setActive`/`setEditable`/`setSelector`/`clear`/`getPage` in. On port disconnect (panel closed) it deactivates and clears, so no overlays linger.
- **`PickerClient`** (`src/lib/pickerClient.svelte.ts`) — the panel-side proxy. Mirrors streamed picker state into `$state` and exposes a `canvas`-shaped object (`state.selector/locked/matchText/structured`, `active`, `editable`, `setSelector` (async — resolves found/throws on invalid), `clearSelection`, plus `url` = the inspected page's canonical URL). Connects via `chrome.tabs.connect` keyed to the active tab, reconnecting on `tabs.onActivated`/`onUpdated` (a `#connectSeq` guard drops superseded connects). Exports the `getCanvas`/`setCanvas` context the views use.

### Canvas (`src/lib/canvas.svelte.ts`)

The interactive picker internals, run **in the content script**. Owns the page-level overlay DOM (dimming, hover outline, locked-selection outline, drag rectangle, dismiss button) and an `<ApertureBar>` that walks ancestors. Listeners on `window` (mousedown/move/up + capturing click) are added/removed via `canvas.active`. State is exposed as `$state` getters via `canvas.state`. Created by `initCanvas(host, shadow, 0)` in `picker.svelte.ts` (the `sidebarWidth` arg is 0 now — no on-page sidebar to avoid). It no longer owns the `getCanvas`/`setCanvas` context — the panel's `PickerClient` does, and `App.svelte`'s `router.onchange` toggles `canvas.active`/`canvas.editable` through that proxy for the picker views (`createAlert`, `editAlert`).

### Selector engine (`src/lib/selector.ts`)

Pure DOM → structured-selector logic, no Svelte. Builds `StructuredSelector` (segments with id/classes/data-attrs/semantic attrs/nth-of-type) and serializes by `SpecificityLevel`. `resolveTarget` (point) and `resolveEnclosingElement` (drag rect) are the two entry points; both filter out the Klaxon host. Covered by `src/lib/tests/selector.test.ts`.

### Shared types and fixtures

- **API types** live in `src/lib/types.d.ts` — `User`, `Org`, `AddOn`, `Run`, `Event`, `Page<T>`, `APIResponse<T, E>`, etc. Most list endpoints return `Page<T>`; `Run` and `Event` reference `AddOn` as either an id or expanded object depending on `?expand=` params.
- **Fixtures** for tests live in `src/test/fixtures/` (`addons.ts`, `events.ts`, `runs.ts`) — typed sample payloads from the DocumentCloud API. Import from tests as `../../test/fixtures/...` (or `../fixtures/...` for tests in `src/test/`).

### Routing & views

The router is a class singleton in **`src/lib/router.svelte.ts`** (`export const router`), shared via the `getRouter`/`setRouter` context. There is no `Router.svelte` component.

- `router.views` is a `Partial<Record<View, ViewEntry>>` where `ViewEntry = { component, load? }`. `View` is the literal union of view names — **adding a view means extending that union and registering an entry in `App.svelte`**.
- `router.navigate(view, props?)` sets `current`/`props`, fires `onchange`, then calls `reload()`. `reload()` runs the current view's `load()` (if any), merges its result into `router.props`, and toggles `router.loading`; failures go to `router.onerror`.
- **Views load their own data.** A view that needs async data exports `load()` from a `<script module>` block (e.g. `ListChanges`, `ListAlerts`). It MUST be in `<script module>`, not the instance `<script>` — Svelte compiles module exports to **named module exports**, so `App.svelte` imports them by name (`import ListChanges, { load as loadListChanges }`) and wires them into the `ViewEntry`. A `load()` exported from the instance script is not reachable as a static and silently never runs.
- `App.svelte` renders the current view dynamically. It binds `const CurrentView = $derived(router.view)` and renders `<CurrentView {...router.props} />` — using a `$derived` variable (not `<router.view ... />`) is required for the component to actually re-mount on navigation. Don't name the local `View`: it collides with the imported `type View`, and while `svelte-check` tolerates it, the bundler errors (`npm run build` is the gate, not `check`).

### UI shell (`src/lib/components/`)

- `App.svelte` — the root. Receives the `PickerClient` as a `canvas` prop, registers `router.views`, wires `router.onchange`/`router.onerror`, provides the router/toaster/canvas contexts (`setRouter`/`setToaster`/`setCanvas` — the last wrapped in `untrack()` since the instance is stable), and renders `Header` + `ToastList` + the current view + a loading bar. An `$effect` calls `router.reload()` when auth flips to `authenticated` (boot + re-login); the call is wrapped in `untrack()` because `reload()` both reads and writes `router.props` and would otherwise retrigger the effect.
- `Header.svelte` — top bar with the Sign in/Sign out button and (when authenticated) the navigation between alert views. Reads `authState` directly.
- `Welcome.svelte` — wraps authenticated views, showing a sign-in CTA when `authState.status !== "authenticated"` and the view's content otherwise.
- `ToastList.svelte` — renders the toasts. The toaster itself is a class singleton in **`src/lib/toaster.svelte.ts`** (`export const toaster`), shared via `getToaster`/`setToaster`; `getToaster()` returns `{ toasts, success, error, dismiss }`. Errors are sticky; successes auto-dismiss after 5s. There is no `Toaster.svelte` component.
- `ApertureBar.svelte` — ancestor-walker UI for the picker (driven by `canvas.state`).
- `RelativeTime.svelte` — small helper for human-readable timestamps.
- Views in `src/lib/views/` (`ListChanges`, `ListAlerts`, `CreateAlert`, `SaveAlert`, `EditAlert`).

### Auth (split between SW and sidebar)

OIDC + PKCE against Squarelet, public client (no secret).

- **Service worker** (`src/background.ts`, built to `build/background.js` via `vite.config.background.ts`) does all of: `launchWebAuthFlow`, token exchange, refresh, storage. It must — `chrome.identity.launchWebAuthFlow` isn't reliably available off the SW. Tokens persist in `chrome.storage.local` under `muckrock_auth`. Concurrent refreshes are deduped (`refreshPromise`). Listens for `auth/login | auth/logout | auth/token | auth/state` runtime messages, plus `api/fetch` for proxying API calls that need the credentialed token, plus `picker/ensure` for injecting the picker content script on demand.
- **Sidebar client** (`src/lib/auth.svelte.ts`) sends those messages and mirrors the stored record into a reactive `authState: $state<{ status, user, expiresAt, error }>`. Subscribes to `chrome.storage.onChanged` for cross-tab sync. `restore()` runs once at side-panel boot (`src/sidepanel.ts`) to seed state from whatever the SW already has. (Now that this runs in the side panel — a true extension page — the old isolated-world `chrome.storage` caveat no longer applies.)
- **OIDC helpers** in `src/lib/oidc.ts` (PKCE, base64url, JWT payload decode, endpoint URL builders, token-exchange / userinfo / refresh fetchers) are pure functions imported by both the SW and `src/lib/tests/oidc.test.ts`.
- **Redirect URI**: the SW logs `chrome.identity.getRedirectURL()` on boot. Squarelet's `django-oidc-provider` does exact-string matching, so this URL (with trailing slash) must be registered verbatim on the OIDC client. **Both browsers are cross-machine stable** because both derive the redirect from the (pinned) extension ID — so two URLs are registered on the OIDC client, one per browser, and both are recomputable offline:
  - **Chrome**: `https://noigegfnnlepflfmiajbpdhpgjgmiikc.chromiumapp.org/`. The ID is pinned by `manifest.json` `"key"` (it's the SHA-256-derived hash of the key, mapped to a–p).
  - **Firefox**: `https://42386841672e9751ac81498187b4242b2e7d8fde.extensions.allizom.org/`. The subdomain is `SHA-1(extension.id)` in hex — `extension.id` is `browser_specific_settings.gecko.id` (`klaxon-cloud@muckrock.com`). Verified against Firefox source: `child/ext-identity.js` does `computeHash(extension.id)` with `CryptoHash("sha1")`, then `https://${hash}.${redirectDomain}/`, where `redirectDomain` is the `extensions.webextensions.identity.redirectDomain` pref (default `extensions.allizom.org`).
  - Caveats: the Firefox URL is only stable **because `gecko.id` is set** — without it, a temporary install gets a random ID and thus a different hash (the source of the "different per machine" reports in old threads; it's _not_ the random `moz-extension://<uuid>` internal UUID, which is unrelated to the identity redirect). Since Firefox 75 you must use the `getRedirectURL()` value as the OAuth `redirect_uri` — you can't substitute a hosted callback page. Confirmed unchanged as of the current source (checked against Firefox 151).
- **Pending refactor**: a follow-on PR will introduce a second token tier — `POST /api/jwt/` on Squarelet ([PR #675](https://github.com/MuckRock/squarelet/pull/675), merged and live on `dev.squarelet.com`) mints a DocumentCloud JWT from the OIDC access token, and DC API calls will use that JWT instead of the OIDC token. Plan at [`../plans/auth-jwt-exchange.md`](../plans/auth-jwt-exchange.md). The current code stores `{ auth, userinfo }`; the refactor moves to `{ oidc, jwt, userinfo }`. Don't bake new code against the current shape.

## Conventions

- **Svelte 5 runes** throughout (`$state`, `$derived`, `$effect`, `$props`). Reactive non-component state lives in `*.svelte.ts` files (e.g. `auth.svelte.ts`, `canvas.svelte.ts`) — the `.svelte.ts` extension is what enables runes outside `.svelte` files.
- **Reactive state in `*.svelte.ts`, shared via context**, not stores. `router` (`router.svelte.ts`) and `toaster` (`toaster.svelte.ts`) export a module singleton plus a `getX`/`setX` context pair; the `canvas` context is the `PickerClient` (`pickerClient.svelte.ts`), built once in `src/sidepanel.ts` and passed to `<App>` as a prop, which calls `setCanvas` so the views resolve `getCanvas()`. In all three, `App.svelte` calls `setX` once so descendants resolve `getX()`; App itself (and non-component code) holds the instance directly rather than via context.
- TS is strict throughout. The service worker and OIDC helpers are TypeScript (`src/background.ts`, `src/lib/oidc.ts`); nothing relevant lives in `static/` anymore beyond `manifest.json` and icons.
- Tests use `happy-dom`, not `jsdom`.
