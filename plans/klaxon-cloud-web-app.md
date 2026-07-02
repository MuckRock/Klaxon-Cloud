# Klaxon Cloud — Companion Web App

## Context

Klaxon Cloud is a Chrome/Firefox browser extension (`/extension`, Svelte 5 + Vite) that lets users monitor a region of a web page for changes. It is a DocumentCloud add-on: it creates/lists/edits scheduled "alerts" (`addon_events`) and shows "runs" (`addon_runs`) entirely through the DocumentCloud REST API, authenticated via MuckRock Accounts (Squarelet OIDC → DocumentCloud JWT).

We are building a companion **web app** in `/site` (freshly scaffolded SvelteKit 2 / Svelte 5) that replicates the add-on UI as a full web product. It must let users sign in with MuckRock Accounts, browse/edit their alerts across all sites, review run history, and discover/launch the extension. To avoid duplicating logic, shared code is hoisted into a new root-level `lib` workspace consumed by both projects.

**Hard constraint that shapes the whole design:** Squarelet's `/openid/token` and the DocumentCloud API send no `Access-Control-Allow-Origin`. The extension only calls them directly because its service worker has CORS-exempting host permissions. A browser-only web app cannot. **Therefore all auth and API calls in `/site` happen server-side** (SvelteKit `+server.ts` / `+page.server.ts` / `hooks.server.ts`), which also lets us keep tokens in an `httpOnly` cookie.

## Decisions (confirmed with user)

- **Code sharing:** npm workspaces. Root `package.json` with `workspaces: ["lib","extension","site"]`, single root lockfile, shared package `@klaxon/lib`.
- **Scope:** phased, foundation first. Each phase ships.
- **Runs route name:** `/activity` (default filters to "Change detected"; `?filter=all` shows all runs).
- **Extension detection:** include now — cross-browser `window.postMessage` content-script bridge, touching both `/extension` and `/site`.
- **Adapter:** `@sveltejs/adapter-cloudflare` (hosting on Cloudflare Workers; SSR + `httpOnly` cookies served from the Worker).

---

## Implementation status (as of 2026-06-29, PR #84 / branch `84-site-alerts`)

**Phase 1 — DONE** (workspaces, shared lib, server-side auth, app shell). `npm test -w lib` (72) and `-w extension` (88) green; `npm run check -w site` clean; `npm run build -w site` emits the Cloudflare worker. **Phase 2 — NOT STARTED. Phase 3 — NOT STARTED.**

Notable deviations from the plan as written (all intentional, captured here so the plan matches reality):

- **Userinfo is not in the session cookie.** The sealed `httpOnly` cookie holds only `{ oidc, jwt }`; the slim user (`uuid/name/email/picture`) is handed to the client via a callback page and kept in `localStorage` (`lib/user.ts` + `lib/user.svelte.ts`). The cookie-chunking code in `session.ts` remains as defensive headroom but is largely unexercised now that userinfo is out of the cookie.
- **Adapter is configured in `vite.config.ts`** (passed to `sveltekit()`), not `svelte.config.js` — supported since SvelteKit 2.62, and `svelte.config.js` is intentionally absent.
- **Signed-in `/` renders a "Welcome back" panel** instead of `redirect(303, "/alerts")` (the target route doesn't exist until Phase 2).
- **ID token is decoded, not signature-verified** (nonce + aud checked); acceptable for a code flow over TLS, matches the extension.
- **Open-redirect hardening added beyond the plan:** `safeReturnTo()` in `auth.ts` resolves `returnTo` against `publicOrigin` via the WHATWG URL parser and rejects off-origin targets (incl. `//host`, `/\host`, and the `/\t/host` whitespace trick); covered by `auth.test.ts`.

### Work remaining

- **Phase 2** (alerts + activity routes) and **Phase 3** (extension discovery / create-alert handoff) — not begun. Note: `site/src/lib/server/api.ts` already exposes the `history/scheduled/dispatch/update` client Phase 2 needs.
- **`wrangler.jsonc`/`wrangler.toml` not added** (plan 1e called for it). The adapter builds without it, but `wrangler dev`/deploy and the `wrangler secret put` workflow need it.
- **No `site` job in CI** — `test.yml` was moved to Node 24 + workspaces with lib/extension jobs, but `npm run check -w site` / `build -w site` aren't run in CI, so site regressions go uncaught.
- **`localStorage` user can desync from the cookie** — on a fresh browser/cleared storage the header shows "Account" with no repopulation short of re-login. Consider exposing the slim user from `+layout.server.ts` as a server-rendered fallback and treating `localStorage` as a cache.
- **OPS BLOCKER (unchanged):** the Squarelet OIDC web client + redirect URIs must be registered before auth works against a real environment.

---

## Phase 1 — Workspaces, shared `lib`, server-side auth, app shell

### 1a. Convert repo to npm workspaces

- New root `package.json`: `{ "private": true, "workspaces": ["lib","extension","site"] }`.
- Remove `extension/package-lock.json` and `site/package-lock.json`; run `npm install` at root → single root lockfile.
- Reconcile Node version: `.github/workflows/test.yml` pins Node 22 but root `.node-version` is `24.14.1` with `engine-strict=true`. Standardize on 24; update the workflow `cache-dependency-path` to the root lockfile and run via `-w` flags.
- Verify nothing broke: `npm run build -w extension`, `npm test -w extension`.

### 1b. Create `lib/` shared package

```
lib/
  package.json      # name "@klaxon/lib", type module, exports map, engines node>=24
  tsconfig.json     # moduleResolution "bundler"
  src/
    index.ts
    oidc.ts         # moved verbatim from extension/src/lib/oidc.ts (pure; no env, no chrome)
    api.ts          # moved + REFACTORED (see 1c)
    types.ts        # moved from extension/src/lib/types.d.ts, ambient decls → exported
    utils.ts        # moved verbatim from extension/src/lib/utils.ts (pure)
  test/
    fixtures/       # moved from extension/src/test/fixtures/ (addons.ts, events.ts, runs.ts)
    oidc.test.ts    # moved from extension/src/lib/tests/oidc.test.ts
    api.test.ts     # new: tests the pure URL/payload builders
  vitest.config.ts  # node env, include test/**/*.test.ts
```

`lib/package.json` exports point straight at raw `.ts` (both consumers use Vite/bundler resolution, no build step):

```json
"exports": {
  ".": "./src/index.ts", "./oidc": "./src/oidc.ts", "./api": "./src/api.ts",
  "./types": "./src/types.ts", "./utils": "./src/utils.ts",
  "./fixtures/*": "./test/fixtures/*.ts"
}
```

**Stays in `/extension`** (chrome/Svelte-coupled, not shared): `auth.svelte.ts`, `canvas*.svelte.ts`, `router.svelte.ts`, `toaster.svelte.ts`, `selector.ts`, all `components/`, `views/`, `background.ts`.

### 1c. Extract the fundamental API logic into the shared lib

Split [extension/src/lib/api.ts](extension/src/lib/api.ts) along a clean seam: the **fundamental, transport-free logic** (endpoint URL construction, query-param assembly, request payload building, the schedule maps, response parsing) moves into `lib/src/api.ts`; the **implementation-specific calling code** (chrome `swFetch`, `getAccessToken`, `import.meta.env` config, the `history/scheduled/dispatch/update` orchestration) stays in `extension/src/lib/api.ts`. Each workspace is allowed its own transport-specific layer — the site has its own equivalent server-side.

`lib/src/api.ts` exports pure builders + constants (no fetch, no token, no env):

```ts
export const schedules: AddOnSchedule[] = [
  "disabled",
  "hourly",
  "daily",
  "weekly",
];
export const eventValues: Record<AddOnSchedule, number> = {
  disabled: 0,
  hourly: 1,
  daily: 2,
  weekly: 3,
};

export interface RunQuery {
  site?: string;
  domain?: string;
  event?: number;
  cursor?: string;
  per_page?: number;
  changesOnly?: boolean;
}
export interface EventQuery {
  site?: string;
  domain?: string;
  event?: number;
  cursor?: string;
  per_page?: number;
}

// URL builders take the env-derived config as plain args (caller owns env)
export function runsUrl(apiUrl: string, klaxonId: string, q: RunQuery): URL; // addon_runs/?expand=...&addon=..., sets message="Change detected" unless changesOnly===false
export function eventsUrl(apiUrl: string, klaxonId: string, q: EventQuery): URL; // addon_events/?expand=addon&addon=...
export function eventUrl(apiUrl: string, eventId: number): URL; // addon_events/<id>/?expand=addon

// Payload builder for dispatch/update
export function eventPayload(
  klaxonId: string,
  schedule: AddOnSchedule,
  parameters: Partial<KlaxonParams>,
): AddOnPayload;
```

- **`changesOnly` lives in `runsUrl`** (default true → sets `message="Change detected"`; `false` omits it) so the web app's `?filter=all` just passes `changesOnly:false`. Extension callers omit it, so behavior is unchanged.
- `getApiResponse` stays in `@klaxon/lib/utils` (already pure) and both workspaces use it to parse.

**Extension `api.ts` keeps its current shape and public surface** — `history/scheduled/dispatch/update` stay exactly as exported (views' imports unchanged), but their bodies now build URLs/payloads via the shared helpers instead of inline string concatenation, then call the unchanged `swFetch` with the `getAccessToken` bearer and parse via `getApiResponse`. Config (`MUCKROCK_DOCUMENTCLOUD_API`, `MUCKROCK_KLAXON_ID`) is read from `import.meta.env` here and passed into the builders.

**Site `lib/server/api.ts`** mirrors that composition server-side: read JWT from `locals.session`, build URLs/payloads via the same shared helpers, call with a direct server `fetch` (no CORS proxy needed server-side), parse via `getApiResponse`. Env from `$env/dynamic/private`.

### 1d. Update extension imports & tests

- Repoint `background.ts`, views, components, and tests: `./lib/oidc.ts`→`@klaxon/lib/oidc`, `./types`→`@klaxon/lib/types`, `./utils`→`@klaxon/lib/utils`, fixtures→`@klaxon/lib/fixtures/*`.
- Split [extension/src/lib/tests/api.test.ts](extension/src/lib/tests/api.test.ts): URL/payload/parse assertions → `lib/test/api.test.ts` (pure builders, no chrome); the SW-envelope + `swFetch` orchestration assertions stay in the extension test.
- The memory note "e2e can't import runes modules" is unaffected — no runes module moves (`auth.svelte.ts` stays). Run `npm test -w extension` and `npm test -w lib`; both green.
- Site vitest gotcha: add `@klaxon/lib` to Vite `ssr.noExternal` (or `test.server.deps.inline`) in `site/vite.config.ts` so vitest transpiles the raw `.ts`.

### 1e. Server-side auth in `/site`

Swap `adapter-auto`→`@sveltejs/adapter-cloudflare` in `site/svelte.config.js`. Add a `wrangler.toml` (or `wrangler.jsonc`) for the Worker. On Cloudflare, secrets/vars are provided via Worker bindings and read through `$env/dynamic/private` (or `platform.env`) — set them with `wrangler secret put` per environment, not baked at build. Note: `jose` uses Web Crypto, which Workers support natively.

**External/ops prerequisite (blocker):** register a **new Squarelet OIDC public client** (PKCE, no secret) for the web app domain, with redirect URI `https://<host>/auth/callback` registered verbatim per environment, plus `post_logout_redirect_uri`. New env (Worker secrets/vars): `MUCKROCK_WEB_CLIENT_ID`, `MUCKROCK_SESSION_SECRET`, `MUCKROCK_PUBLIC_ORIGIN`. Reuse `MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_SCOPES`, `MUCKROCK_DOCUMENTCLOUD_API`, `MUCKROCK_KLAXON_ID`. Add `site/.env.example`.

**Token storage:** stateless **encrypted `httpOnly` `Secure` `SameSite=Lax` cookie** (`jose` `EncryptJWT`/`jwtDecrypt`, keyed by `MUCKROCK_SESSION_SECRET`). Session payload reuses the extension's `StoredAuth` shape `{ oidc, jwt, userinfo }`. PKCE flow state carried in a separate short-lived (`Max-Age` ~600s) encrypted cookie `{ state, nonce, verifier, returnTo }`. If userinfo+tokens exceed ~4KB, trim userinfo to `{ sub, uuid, name, email, picture }`.

**Files:**

```
site/src/
  hooks.server.ts                 # unseal session → locals.user/locals.session; refresh expired JWT; guard /(app)
  lib/server/session.ts           # seal/unseal cookies, names, options
  lib/server/auth.ts              # login-url build, callback exchange, refreshSession (mirrors background.ts two-tier), logout
  lib/server/api.ts               # history/scheduled/dispatch/update built on @klaxon/lib builders + server fetch + locals JWT
  app.d.ts                        # App.Locals { user, session }, App.PageData { user }
  routes/
    auth/login/+server.ts         # build PKCE+state, set cookie, 302 to buildLoginUrl/buildSignupUrl
    auth/callback/+server.ts      # verify state/nonce/aud, getAuthToken → exchangeOidcForJwt + getUserInfo, set session, 302 returnTo
    auth/logout/+server.ts        # clear cookies, 302 to endpoints().endSession
    +layout.server.ts             # expose locals.user
```

Reuse from `@klaxon/lib/oidc`: `randomBase64Url`, `pkceChallenge`, `buildAuthorizeUrl`, `buildLoginUrl`/`buildSignupUrl`, `endpoints`, `getAuthToken`, `decodeJwtPayload`, `exchangeOidcForJwt`, `getUserInfo`, `refreshJwt`, `hasTokenExpired`, `hasJwtExpired`. `refreshSession` mirrors `background.ts` `refreshTokens` (tier 1 `refreshJwt`; on failure tier 2 re-mint from OIDC refresh + `exchangeOidcForJwt` + `getUserInfo`; on total failure clear session). Dedup concurrent refreshes with a module-level `Map<refreshToken, Promise>`. Keep `credentials:"omit"` (already in shared oidc).

### 1f. App shell + signed-out landing

- `site/src/lib/styles/tokens.css` — copy the `:root` token block from the extension's `App.svelte`; `app.css` ports global `.btn-primary`/`.button-row`; ship Source Sans Pro via normal `@font-face` (the extension's FontFace-API trick is a shadow-DOM-only workaround).
- `routes/+layout.svelte` — full-page shell + `SiteHeader` (rebuilt from extension `Header`, reads `data.user`, sign-in/out links).
- `routes/+page.svelte` — signed-out marketing landing (what Klaxon is / why use it; reuse `Siren`, `Logotype` copy); signed-in → `redirect(303, "/alerts")`.
- Move reusable presentational components to `lib` (or a `site` local set): `RelativeTime`, `Logo`, `Logotype`, `Siren`, `Loading` reuse as-is (need only CSS vars); `UserInfo` reused with `user` prop instead of `authState`.

---

## Phase 2 — Alerts & Activity (read + edit)

All data via server-side load functions / form actions calling `site/src/lib/server/api.ts`. Routes under a `(app)` group guarded by hooks.

```
routes/(app)/
  alerts/+page.server.ts          # api.scheduled({}) across ALL sites (+ optional history join)
  alerts/+page.svelte             # full-page list/table (rebuilt from ListAlerts, no tab-origin filter)
  alerts/[id]/+page.server.ts     # one event + its recent runs (history({event:id}))
  alerts/[id]/+page.svelte        # detail (rebuilt from ViewAlert)
  alerts/[id]/edit/+page.server.ts# load event; form action → api.update()
  alerts/[id]/edit/+page.svelte   # EditAlert fields: schedule, title, slack_webhook (+ reactivate)
  activity/+page.server.ts        # history({ changesOnly: filter!=="all" }); ?filter=all|changes
  activity/+page.svelte           # run feed + changes-vs-all toggle
  activity/[uuid]/+page.server.ts # single run (needs GET-by-uuid; see risk)
  activity/[uuid]/+page.svelte    # run detail: status, message, created_at, links to data.compare (Wayback diff), data.snapshot, file_url
```

- **Edit form constraint:** the **selector/site cannot be edited on the web** — changing the watched region needs the canvas picker, which is extension-only. The edit form changes `schedule`/`title`/`slack_webhook` and preserves existing `selector`/`site` on the PATCH; show a note pointing users to the extension to re-pick a region.
- Use SvelteKit form actions + `use:enhance` for edit/disable/reactivate.
- Component reuse table — **do NOT port**: `SaveAlert`, `CreateAlert`, `EditSelection`, `SelectionPicker`, `ApertureBar`, `PinnedTabNotice` (all canvas/picker-bound). **Replaced by SvelteKit:** `App.svelte`, `router.svelte.ts`, `canvas*`, `auth.svelte.ts`, `Link`→native `<a>`, toaster→SvelteKit pattern.

---

## Phase 3 — Extension discovery & create-alert handoff

Cross-browser bridge via a content script + `window.postMessage` (Chrome `externally_connectable` is unreliable in Firefox).

**`/extension` changes:**

- New content script `src/web-bridge.ts` injected on the web-app origin(s): origin-checked `postMessage` ping/pong to announce presence, and relays a "create alert" request (URL) to `background.ts`.
- `background.ts`: new `web/create-alert` handler — opens the side panel and opens the provided URL in a new tab.
- `manifest/base.json`: add `content_scripts` matching the web-app origin(s) per environment; add a vite build config to emit `web-bridge.js`.

**`/site` changes:**

- `src/lib/extension-bridge.ts` — `detectExtension()` (ping + timeout) and `createAlert(url)` (postMessage).
- `routes/(app)/new/+page.svelte` — if detected: URL input + "Create new alert" button (opens extension, then opens URL in new tab); if not: browser-specific install CTA (Chrome Web Store / Firefox Add-ons link based on UA).

---

## Verification

- **Per phase:** `npm test -w lib`, `npm test -w extension` (stay green), `npm run check -w site`, `npm run build -w extension`, `npm run build -w site`.
- **Auth (Phase 1):** with the OIDC client registered, `npm run dev -w site` (or `wrangler dev` against the built Worker), sign in via MuckRock Accounts, confirm callback sets the session cookie and `locals.user` populates; confirm JWT auto-refresh by waiting past JWT expiry and reloading; confirm logout clears cookies. Drive with the Playwright MCP browser tools.
- **Alerts/Activity (Phase 2):** load `/alerts` and confirm it lists alerts across all sites; open an alert, edit schedule/title/slack and confirm the PATCH persists and selector/site are preserved; toggle `/activity?filter=all` vs changes and confirm the run set differs.
- **Detection (Phase 3):** load `/extension` build unpacked in Chrome + Firefox, visit `/new`, confirm presence is detected and "Create new alert" opens the extension + target tab; with the extension disabled, confirm the install CTA shows the correct per-browser link.

## Key risks / open items

- **OPS BLOCKER:** new Squarelet OIDC client + redirect URIs must exist before auth works.
- **Single-run fetch:** `/activity/[uuid]` needs a GET-by-uuid on `addon_runs`; confirm the DocumentCloud API supports `GET /api/addon_runs/<uuid>/` (the extension only ever lists). If not, fetch via list + filter.
- **Cookie size** if userinfo carries many orgs — trim or split cookies.
- **Refresh races:** the module-level dedup Map only dedups within a single Worker isolate; Cloudflare spreads requests across isolates, so concurrent refreshes across isolates can both hit `/api/refresh/` — acceptable (Squarelet rotates refresh tokens; last cookie write wins). Strict single-use would need a shared store (e.g. KV/Durable Object).
- **CI:** update `.github/workflows/` for the workspace layout + add a `site` job; reconcile Node 22→24.
