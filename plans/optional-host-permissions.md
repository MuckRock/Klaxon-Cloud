# Drop broad `host_permissions` → optional per-origin host

## Status

**Implemented** on branch `allanlasser/issue42-v2` (check + lint + 149 unit tests
green; both browsers build). Not yet validated against a live Web Store
submission — see "Biggest risk" below.

## Why

The Chrome Web Store flags broad install-time host permissions
(`http://*/*`, `https://*/*`) for an in-depth review that can delay publishing by
weeks. Klaxon doesn't actually need standing access to all sites: the page
**monitoring is server-side** (MuckRock re-fetches the watched page), so the
extension only touches a page at two user-initiated moments:

1. **Create** — picking a region on the current tab.
2. **View/Edit** — re-opening an existing alert's page to inspect/change its
   selection.

Today the broad grant exists only because tracking mode auto-injects `page.js`
into every tab on switch (`canvas-client.svelte.ts` `#connect`). We remove that
auto-injection and move host access to **runtime, per-origin, user-granted**.

## Resolved decisions

1. **Keep `activeTab`** — used to signal viewing a tab different from the open
   alert (`#activeTabId` / `away` tracking).
2. **Picker-only-on-explicit-start** — do _not_ auto-inject for already-granted
   origins. The picker appears only when the user explicitly starts a flow.
3. **Firefox floor ≥ 127** — so `optional_host_permissions` is supported on both
   browsers; no `optional_permissions` fallback needed.
4. **`viewAlert` entry** — convert the `<Link>` to a request-then-navigate click
   handler so opening a cross-origin alert prompts for that origin first.

## The one hard constraint

`chrome.permissions.request({ origins })` **must run inside a user-gesture
handler**, and must be the first async call there (an `await` before it consumes
the activation). So the request lives in the view's click handler — _not_ in
`handleRouteChange` (fires after `navigate`) or a `pinned` setter. Granted
origins persist, so it's one prompt per domain, ever. `executeScript` itself
needs no gesture, only the held permission.

## Changes by file

### `extension/manifest/base.json`
- Remove `"host_permissions": ["http://*/*","https://*/*"]`.
- Add `"optional_host_permissions": ["http://*/*","https://*/*"]`.
- Keep `scripting`, `tabs`, `identity`, `storage`, `activeTab`.
- `web_accessible_resources` unchanged (not a granted permission).

### `extension/src/lib/canvas-client.svelte.ts` (bulk of the work)
- `async requestWatch(origin?): Promise<boolean>` — wraps
  `chrome.permissions.request({ origins: ["<origin>/*"] })`; called from gesture
  handlers.
- `#hasHost(origin): Promise<boolean>` — wraps `chrome.permissions.contains`.
- Split connect:
  - `#connect()` (tracking): keep URL/title/origin resolution; **delete** the
    `#ensureInjected` + `chrome.tabs.connect` block. No port in tracking mode.
  - `#connectInjected(tabId)`: the current inject + port + `getPage` logic, used
    on flow entry and by `navigateTab`.
- Redefine `watchable` from "injected & connected" → `injectable(tab.url)`
  (URL-scheme check). UI gating still works; the "injection failed" signal now
  surfaces when the flow starts.
- `set pinned(true)` → `#connectInjected` on the pinned tab (permission already
  granted in the click handler). `navigateTab` → `#connectInjected` after the
  navigation settles.

### `extension/src/lib/views/ListAlerts.svelte` (gesture entry points)
- "Create alert" button: `onclick={async () => { if (await canvas.requestWatch())
  router.navigate("createAlert"); }}`; keep `disabled={!canvas.watchable}`; toast
  on denial.
- `<Link view="viewAlert">`: convert to a click handler that
  `requestWatch(alert.origin)` then navigates (cross-origin alerts).

### `extension/src/background.ts`
- `ensureCanvas` / `canvas/ensure` unchanged. `executeScript` now succeeds only
  when the origin is granted; the existing `ok:false` path handles denial.

### `extension/src/lib/components/App.svelte`
- `handleRouteChange` logic unchanged; injection rides the `pinned`-set path.

## Edge cases
- **Denied** → toast, stay on the list (don't enter a portless flow).
- **Restricted pages** (`chrome://`, web store, PDF, `file://`) → `injectable`
  false → Create disabled, as today.
- **Re-watching a granted site** → `contains` true → no prompt.

## Testing
- Unit: `requestWatch` grant/deny; `watchable` = scheme check.
- Manual (fresh profile): watch new site → prompt → picker; switch tabs → no
  prompt/no inject; re-watch → no prompt; open existing alert on another domain →
  prompt for that domain.
- e2e: the permission prompt isn't drivable headless — pre-seed via
  `context.grantPermissions` or stub `chrome.permissions`.

## Biggest risk to validate
Google's review-policy page couldn't be fetched verbatim, so the review-skip is
**highly likely but unconfirmed**. Cheapest validation: ship this branch as a
draft/unlisted submission and confirm the warning disappears before polishing.
