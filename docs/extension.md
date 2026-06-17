# The browser extension (Klaxon Cloud)

A Chrome/Firefox extension built with Svelte 5, Vite, and TypeScript. It lives in [`extension/`](../extension/). This page covers what it does and how it talks to the rest of the system; for build/dev mechanics see [`extension/README.md`](../extension/README.md) and [`extension/CLAUDE.md`](../extension/CLAUDE.md).

## What it is

When the user clicks the toolbar button, the extension opens a **native browser
sidebar** — Chrome's `sidePanel`, Firefox's `sidebarAction` — hosting the Svelte
app. Unlike the old injected sidebar, this panel persists across page navigations
and has full `chrome.*` access. To pick a region of a page, the panel injects a
small **content script** (the Canvas) into the active tab on demand. From the
sidebar the user can:

- **pick a region of the page** to watch (or watch the whole page),
- **save it as an alert** with a schedule and notification options,
- **see existing alerts** for the current site and their recent changes,
- **edit, disable, or reactivate** alerts.

The extension stores nothing of its own except auth tokens; every alert and
change it shows is fetched live from the DocumentCloud API.

## Three build components

Two browser realms can't share code at runtime — the panel is an extension page,
the Canvas is a page-injected content script — so the build has three entries plus
the service worker. Chrome extensions need fixed filenames listed in the manifest,
so the page and worker bundles are unhashed; the panel is a normal HTML page, so
its JS/CSS may be hashed (the manifest only points at `sidepanel.html`). Each
build component has its own Vite config under [`extension/vite/`](../extension/vite/):

- **`build/<browser>/sidepanel.html` + `sidepanel.js`** — the side panel
  (entry `src/sidepanel.ts`, config `vite/sidepanel.config.ts`). This is the
  sidebar UI: the Svelte app and the API client. It runs in the browser's native
  panel as an extension-origin page.
- **`build/<browser>/page.js`** — the Canvas content script (entry
  `src/page.svelte.ts`, config `vite/page.config.ts`). Injected on demand into the
  active tab; it owns the on-page picker overlays inside a shadow DOM. This config
  also owns `static/` (icons, fonts) and writes the per-browser `manifest.json`.
- **`build/<browser>/background.js`** — the service worker (entry
  `src/background.ts`, config `vite/background.config.ts`). It owns everything the
  panel can't do directly: the OIDC sign-in flow, token storage/refresh, a fetch
  proxy, and injecting `page.js` on request (`canvas/ensure`).

The service worker also opens the sidebar from the toolbar button — on Chrome via
`sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, on Firefox by
toggling `sidebarAction` on `action.onClicked`. See
[`src/background.ts`](../extension/src/background.ts). The panel reaches the worker
through `chrome.runtime.sendMessage`.

## The Canvas (selecting what to watch)

The picker is split across the two realms, joined by a `chrome.tabs` port:

- **Engine** — [`src/lib/canvas.svelte.ts`](../extension/src/lib/canvas.svelte.ts)
  (interaction/overlay) and [`src/lib/selector.ts`](../extension/src/lib/selector.ts)
  (pure DOM → selector logic) — runs **in the page** via `src/page.svelte.ts`.
- **Proxy** — [`src/lib/canvas-client.svelte.ts`](../extension/src/lib/canvas-client.svelte.ts)
  (`CanvasClient`) — runs **in the panel**. It mirrors the engine's reactive state
  into `$state` and proxies actions over the port, presenting the same
  `canvas`-shaped object the views consume via `getCanvas`/`setCanvas` (the one
  ergonomic change: `setSelector` is now `async`).

How it behaves:

- As the user hovers, the canvas highlights the element under the cursor; click
  to **lock** a selection; drag to select an enclosing region.
- `selector.ts` turns the chosen element into a structured CSS selector
  (id / classes / data-attrs / semantic attrs / `nth-of-type`) and serializes it.
- Picking is only live on the picker views (`createAlert`, `editSelection`); the
  router toggles `canvas.active` / `canvas.editable` as views change.
- If **no** selection is locked when saving, the alert watches the **whole page**, saved as the selector `"*"` — the value the Add-On's `soup.select("*")` expects. An empty selector would raise on the backend, so the save paths (`SaveAlert`, `EditSelection`) normalize whole-page to `"*"` via `WHOLE_PAGE_SELECTOR`. The `isWholePage()` helper in `utils.ts` treats both `"*"` and a legacy empty string as whole-page when displaying alerts.

The selector string is what ends up in the event's `parameters.selector` and is later handed to the Add-On, which runs it through BeautifulSoup's `soup.select()`.

## Tab lifecycle and restricted pages

The panel is **one document shared across every tab** in a window. Its view/form
state is **global** — it changes only when you navigate it, never when you switch
tabs. The only tab-aware piece is the Canvas, which runs in two modes:

- **Tracking** (default, on the alert list): `CanvasClient` follows the active
  tab — reconnecting on `tabs.onActivated` and on a completed top-level
  navigation — so `origin`/`watchable` reflect the page you're looking at and the
  list shows that page's alerts. No overlay.
- **Pinned** (during a selection flow — `createAlert` / `saveAlert` / `viewAlert`
  / `editAlert` / `editSelection`): the canvas locks onto the tab the flow began
  on and stops following tab switches (`CanvasClient.pinned`). The port to that
  page stays open, so its overlay stays where it was injected — you don't see it
  while looking at another tab, and it's there when you switch back. The flow
  stays coherent. `App.svelte`'s `handleRouteChange` pins on entering a selection
  view and unpins (clearing the selection, then re-syncing to the active tab) on
  returning to the list. Closing the panel disconnects the port, which hides the
  overlay (the engine's `visible` flag) without losing it.
- On **restricted pages** (`chrome://`, the web store, PDFs, `file://`) the Canvas
  can't be injected; `CanvasClient.watchable` stays false. `ListAlerts.svelte`
  then shows a "can't watch this page" empty state and disables **Create a new
  alert**. The page's canonical URL/title and origin are resolved page-side and
  sent to the panel (`getPage` over the port); on restricted pages the panel falls
  back to the raw tab URL.

## Views and navigation

Routing is a small client-side router (no URLs; it's a sidebar) in
[`src/lib/router.svelte.ts`](../extension/src/lib/router.svelte.ts). The
registered views (from [`App.svelte`](../extension/src/lib/components/App.svelte)):

| View | File | Purpose |
| --- | --- | --- |
| `listAlerts` (default/home) | `views/ListAlerts.svelte` | All alerts for the current site, each joined to its latest change; multi-select + bulk disable. |
| `createAlert` | `views/CreateAlert.svelte` | Step 1 of creating: pick the region. |
| `saveAlert` | `views/SaveAlert.svelte` | Step 2: schedule + title + Slack, then save. |
| `viewAlert` | `views/ViewAlert.svelte` | One alert's details + its recent changes. |
| `editAlert` | `views/EditAlert.svelte` | Change schedule/title/Slack; disable or reactivate. |
| `editSelection` | `views/EditSelection.svelte` | Re-pick the region for an existing alert. |
| `signIn` | `views/SignIn.svelte` | Sign-in interstitial; can resume a deferred save (below). |

### The "create alert" flow

1. **`createAlert`** — the user picks a region (or leaves it unlocked for the
   whole page) and continues.
2. **`saveAlert`** — the user sets the schedule (default **weekly**; options
   hourly/daily/weekly), an optional title (defaults to the page's canonical
   title), and an optional Slack webhook. On submit the extension builds a
   `KlaxonParams` object and calls `dispatch()` (see API client below).
   - The watched URL is the page's **canonical URL** (`og:url` →
     `link[rel=canonical]` → `location.href`), resolved by
     [`src/lib/url.ts`](../extension/src/lib/url.ts).
3. If the user **isn't signed in**, the save is deferred: the app routes to
   `signIn`, carrying the dispatch arguments forward and the form values back, so
   after authentication the save completes and nothing typed is lost.

Saving creates an **Add-On Event** (POST `addon_events/`). See
[data-flow.md](./data-flow.md#flow-a--creating-an-alert).

## The API client

[`src/lib/api.ts`](../extension/src/lib/api.ts) is the entire surface the
extension uses against DocumentCloud. The base URL is
`MUCKROCK_DOCUMENTCLOUD_API` (default `https://api.www.documentcloud.org/api/`),
and almost every call is scoped to `addon=MUCKROCK_KLAXON_ID`.

| Function | HTTP call | Purpose |
| --- | --- | --- |
| `scheduled({ site/domain, ... })` | `GET addon_events/?expand=addon&addon=<KLAXON_ID>` | List the user's alerts, filtered by site or domain. |
| `history({ site/domain/event, ... })` | `GET addon_runs/?expand=addon,event&addon=<KLAXON_ID>&message=Change detected` | List runs **that detected a change** (the `message` filter drops no-op runs). |
| `dispatch(schedule, params)` | `POST addon_events/` | Create a new alert. |
| `update(event_id, schedule, params)` | `PATCH addon_events/<id>/?expand=addon` | Edit an alert, change its schedule, or disable it. |

Key details:

- **Schedule ↔ integer mapping.** The UI uses string schedules; the API uses the
  `event` integer. `api.ts` keeps both: `eventValues = { disabled: 0, hourly: 1,
  daily: 2, weekly: 3 }` and the inverse `schedules` array. "Disabling" an alert
  is just `PATCH`-ing `event: 0`.
- **Filtering by `domain` vs `site`.** Listing on the home screen filters by
  `domain` = `window.location.origin`, so you see every alert for the current
  site regardless of path. `viewAlert` filters by exact `site` + `event` id. The
  backend has dedicated indexes for both (see
  [documentcloud.md](./documentcloud.md#site-and-domain-filters)).
- **The `message=Change detected` filter** is why the UI shows "changes," not
  every run. Runs where nothing changed carry `"No changes detected on the site"`
  and are filtered out.
- **`run.data`** (`{ compare, snapshot, timestamp }`) is what the UI links to:
  "View changes" → the Wayback visual diff (`data.compare`); the run title can
  link to the new snapshot (`data.snapshot`).

### Why the fetch goes through the service worker

API calls don't `fetch` directly from the panel. `api.ts` sends an
`api/fetch` message to the service worker (`swFetch`), which performs the real
request and returns a Response-shaped object. This keeps the bearer token out of
the panel/page context and sidesteps CORS. Cookies are deliberately **omitted**
(`credentials: "omit"`) to avoid tripping DocumentCloud's CSRF protection; the
bearer token is the only credential.

## Authentication

OIDC Authorization Code + PKCE against **Squarelet**, as a **public client** (no
client secret). All of it lives in the service worker
([`src/background.ts`](../extension/src/background.ts)) with pure helpers in
[`src/lib/oidc.ts`](../extension/src/lib/oidc.ts); the sidebar mirrors auth state
reactively via [`src/lib/auth.svelte.ts`](../extension/src/lib/auth.svelte.ts).

Two token tiers are stored under `muckrock_auth` in `chrome.storage.local`, as
`{ oidc, jwt, userinfo }`:

1. **OIDC tokens** from Squarelet (`/openid/token`) — obtained via the PKCE flow.
2. **A DocumentCloud JWT**, minted by exchanging the OIDC access token at
   Squarelet's `/api/jwt/` endpoint (`exchangeOidcForJwt`). **This JWT is what the
   DocumentCloud API accepts** — every `Authorization: Bearer …` header in
   `api.ts` carries the JWT, not the OIDC token.

Refresh is two-tiered: try refreshing the DC JWT directly (`/api/refresh/`);
if that fails, refresh the OIDC token and re-mint a JWT + re-fetch userinfo; if
*that* fails, the user is signed out. Concurrent refreshes are deduped.

Sign-up vs sign-in: the same flow, but "create account" fronts the authorize URL
with Squarelet's signup page, which returns to the authorize URL once the account
exists.

### Redirect URIs

Sign-in returns to a browser-generated redirect URL that must be registered
verbatim on the Squarelet OIDC client. Both Chrome and Firefox derive a **stable**
URL from the (pinned) extension id, so two fixed URLs are registered. The exact
values and the math behind them are documented in detail in
[`extension/README.md`](../extension/README.md) and
[`extension/CLAUDE.md`](../extension/CLAUDE.md) — not repeated here.

## Build-time configuration

`MUCKROCK_*` env vars are baked into the bundle at build time (Vite
`envPrefix: "MUCKROCK_"`). The two that must be set per environment:

- `MUCKROCK_CLIENT_ID` — the Squarelet OIDC public client id.
- `MUCKROCK_KLAXON_ID` — the numeric id of the Klaxon `AddOn` in DocumentCloud.
  **This changes between environments** (dev vs prod DocumentCloud), and the API
  client filters every request on it.

`MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_DOCUMENTCLOUD_API`, and `MUCKROCK_SCOPES`
default to the dev environment. See
[`extension/.env.example`](../extension/.env.example).
