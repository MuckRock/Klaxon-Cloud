# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Klaxon Cloud — a Chrome/Firefox MV3 browser extension (Svelte 5 + Vite + TypeScript) that injects a sidebar into the active page. The user hovers/clicks/drags to pick a DOM region; the extension records a CSS selector + matched text used to monitor that region for changes. Successor to the older Klaxon bookmarklet.

The repo lives at `Klaxon-Cloud/extension/`. The parent repo also contains `plans/` (design docs, e.g. `plans/auth.md`) and may contain a symlinked `research/` dir.

## Commands

```sh
npm run dev          # vite build --watch — no dev server; loads unpacked from build/
npm run build        # one-shot production build into build/
npm run check        # svelte-check (type-check .svelte + .svelte.ts)
npm run lint         # prettier --check .
npm run format       # prettier --write .
npm test             # vitest run (happy-dom)
npm run test:watch
```

Single test: `npx vitest run src/lib/tests/oidc.test.ts` or filter by name `npx vitest run -t "pkce"`.

Loading in Chrome: `chrome://extensions` → enable Developer mode → Load unpacked → select `build/`. The action button injects the content script. The extension ID is pinned by the `"key"` in `static/manifest.json`, so it's stable across reloads.

## Env vars

`MUCKROCK_*` vars in `.env` are baked into the bundle at build start (`envPrefix: "MUCKROCK_"`). **Restart `npm run dev` after editing `.env`** — Vite only reads env files at startup and will otherwise keep emitting builds with stale values. After a rebuild, also reload the extension at `chrome://extensions`. Required: `MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_CLIENT_ID`. See `.env.example`.

## Architecture

### Build shape (vite.config.ts)

- **One IIFE bundle** at `build/content.js`, entry `src/main.svelte.ts`. The service worker injects this file via `chrome.scripting.executeScript`.
- **CSS is `injected`** into JS (via the Svelte compiler option) so styles work inside the shadow DOM the content script creates.
- **No asset hashing**, no code splitting — Chrome extensions need stable filenames listed in `manifest.json`.
- `static/` is Vite's `publicDir`: `manifest.json`, icons, `background.js`, and `static/lib/oidc.js` are copied to `build/` verbatim.

### Content script (`src/main.svelte.ts`)

Creates `<div id="klaxon-host">` on `document.body`, attaches an open shadow root, shifts `body.style.marginRight` by `SIDEBAR_WIDTH`, mounts `<App>` inside the shadow root, and on cleanup unmounts and restores the margin. Guarded by `window._klaxonInject` to prevent double-injection (and warns if the legacy bookmarklet is already running).

### Canvas (`src/lib/canvas.svelte.ts`)

The interactive picker. Owns the page-level overlay DOM (dimming, hover outline, locked-selection outline, drag rectangle, dismiss button) and an `<ApertureBar>` that walks ancestors. Listeners on `window` (mousedown/move/up + capturing click) are added/removed via `canvas.active`. The router toggles `canvas.active = (view === "createAlert")`, so picking is only live in the create-alert view. State is exposed as `$state` getters via `canvas.state` so Svelte components can react.

### Selector engine (`src/lib/selector.ts`)

Pure DOM → structured-selector logic, no Svelte. Builds `StructuredSelector` (segments with id/classes/data-attrs/semantic attrs/nth-of-type) and serializes by `SpecificityLevel`. `resolveTarget` (point) and `resolveEnclosingElement` (drag rect) are the two entry points; both filter out the Klaxon host. Covered by `src/lib/tests/selector.test.ts`.

### Shared types and fixtures

- **API types** live in `src/lib/types.d.ts` — `User`, `Org`, `AddOn`, `Run`, `Event`, `Page<T>`, `APIResponse<T, E>`, etc. Most list endpoints return `Page<T>`; `Run` and `Event` reference `AddOn` as either an id or expanded object depending on `?expand=` params.
- **Fixtures** for tests live in `src/test/fixtures/` (`addons.ts`, `events.ts`, `runs.ts`) — typed sample payloads from the DocumentCloud API. Import from tests as `../../test/fixtures/...` (or `../fixtures/...` for tests in `src/test/`).

### UI shell (`src/lib/components/`)

- `App.svelte` — initializes the canvas with `untrack`'d host/shadow refs (one-shot init, not reactive on prop change), wires canvas state into Sidebar, destroys canvas on unmount.
- `Router.svelte` — tiny context-based router. `setContext("router", ...)` exposes `{ view, navigate }`; consumer code calls `getRouter()`. View names are a literal union; add new views to the `View` type and to the `{#if router.view === ...}` ladder in `Sidebar.svelte`.
- `Toaster.svelte` — same context pattern, `getToaster()` returns `{ success, error, dismiss }`. Errors are sticky; successes auto-dismiss after 5s.
- Views in `src/lib/views/` (`Debug`, `CreateAlert`, `SaveAlert`).

### Auth (split between SW and sidebar)

OIDC + PKCE against Squarelet, public client (no secret).

- **Service worker** (`static/background.js`, plain JS, ES module) does all of: `launchWebAuthFlow`, token exchange, refresh, storage. It must — content scripts can't call `chrome.identity.launchWebAuthFlow`. Tokens persist in `chrome.storage.local` under `muckrock_auth`. Concurrent refreshes are deduped (`refreshPromise`). Listens for `auth/login | auth/logout | auth/token | auth/state` runtime messages.
- **Sidebar client** (`src/lib/auth.svelte.ts`) sends those messages and mirrors the stored record into a reactive `authState: $state<{ status, user, expiresAt, error }>`. Subscribes to `chrome.storage.onChanged` for cross-tab sync. `restore()` runs once at content-script boot to seed state from whatever the SW already has.
- **OIDC helpers** in `static/lib/oidc.js` (PKCE, base64url, JWT payload decode, endpoint URL builders) are pure functions imported by both the SW and `src/lib/tests/oidc.test.ts`.
- **Redirect URI**: the SW logs `chrome.identity.getRedirectURL()` on boot. Squarelet's `django-oidc-provider` does exact-string matching, so this URL (with trailing slash) must be registered verbatim on the OIDC client. Chrome's URI is stable thanks to `manifest.json` `"key"`; Firefox uses a per-profile UUID — see `../plans/auth.md`.

## Conventions

- **Svelte 5 runes** throughout (`$state`, `$derived`, `$effect`, `$props`). Reactive non-component state lives in `*.svelte.ts` files (e.g. `auth.svelte.ts`, `canvas.svelte.ts`) — the `.svelte.ts` extension is what enables runes outside `.svelte` files.
- **Context-based singletons** (router, toaster) instead of stores. Use `getRouter()` / `getToaster()` from descendants.
- TS is strict; `tsconfig.json` enables `checkJs` so the JS service worker and `oidc.js` are type-checked too.
- Tests use `happy-dom`, not `jsdom`.
