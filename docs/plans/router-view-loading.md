# Router-driven views with per-view data loading

## Status

**Complete (2026-06-02), verified with `npm run check` + `npm run build`.** All seven steps landed on branch `35-router-refactor`. Shipped largely as planned, with three deviations and three runtime gotchas worth recording.

**Deviations from the plan:**

- **Step 1 — canvas context, but not a module singleton.** `canvas` is built per-mount by `initCanvas()` (it needs the host/shadow refs), so unlike `router`/`toaster` there's no `export const canvas`. Only the `getCanvas`/`setCanvas` context pair was added; `App.svelte` calls `setCanvas(canvas)` after init.
- **Step 2 — `load` is wired explicitly, not read off the component.** A `<script module>` `export function load` compiles to a **named module export**, _not_ a static on the component value — `Component.load` is `undefined` at runtime (svelte-check accepts it anyway; type/runtime mismatch). So the registry changed: `router.views` is `Partial<Record<View, ViewEntry>>` where `ViewEntry = { component, load? }`, and `App.svelte` imports the named load (`import ListChanges, { load as loadListChanges }`) and pairs them. The planned `ViewComponent & { load? }` type was dropped for `LoadFn` + `ViewEntry`.
- **Step 7 — no `RouterHost`, toaster became a singleton.** The original wiring put `router.onerror` + the dynamic view in a `RouterHost.svelte` child (so it could `getToaster()` from inside the provider). Replaced: the toaster was extracted to a **`toaster.svelte.ts` module singleton** (mirroring `router`), so `App.svelte` imports it directly, wires `router.onerror`, and renders the view inline. **`RouterHost.svelte` and `Toaster.svelte` were both deleted**; `setToaster(toaster)` is called in `App.svelte` alongside `setRouter`/`setCanvas`.

**Runtime gotchas discovered (none caught by `npm run check`):**

1. **`load` is a named module export, not a component static** — see Step 2 deviation. The fix is the `ViewEntry` pairing.
2. **Boot `$effect` self-triggered.** `reload()` both reads (`load(this.props)`) and writes `this.props`; the synchronous read made `props` a dependency of the auth-reload effect, so its own write retriggered it → infinite loading. Fixed by wrapping the call in `untrack(() => router.reload())`.
3. **`<router.view ... />` doesn't swap on navigation.** As a member-expression tag it compiles to a one-time call inside the `{#if}`; it re-renders only on truthiness change, not when the component identity changes. Fixed by binding `const CurrentView = $derived(router.view)` and rendering `<CurrentView .../>` (emits Svelte's reactive `$.component(...)` helper). The local must **not** be named `View` — that collides with the imported `type View` and, while svelte-check tolerates it (separate namespaces), the bundler's parser errors (`Identifier 'View' has already been declared`). `npm run check` is not a sufficient gate for this; run `npm run build`.

CLAUDE.md (Canvas, Routing & views, UI shell, Conventions sections) was updated to match. Open question on `router.props` typing left for later.

## What and why

Today [App.svelte](../extension/src/lib/components/App.svelte) does three jobs that should belong elsewhere:

1. **Picks the view** with a hand-maintained `{#if router.current === ...}` ladder (lines 87–115).
2. **Loads data** centrally (`loadData()` → `scheduled()` + `history()`) and pushes `events`/`runs` down as props.
3. **Wires canvas** into the picker views (`locked`, `selector`, `matchText`, `onselectorchange`, `onclearselection`, `onsave`).

The goal:

- **Router chooses the view.** The ladder collapses to a single `<router.view {...router.props} />`.
- **Each view loads its own data** via an exported `load()` that the router awaits during `navigate()` and merges into `router.props` (the mechanism already exists in [router.svelte.ts](../extension/src/lib/router.svelte.ts) `navigate()`).
- **App.svelte shrinks** to: register views, init canvas, render shell.

## The hard part: not everything is async data

`router.props` is a **static snapshot** captured at `navigate()` time. That's fine for:

- `events` / `runs` — async data → `load()`.
- `event` (which alert to edit) — a navigation param → passed as `router.navigate("editAlert", { event })`.

But three views also consume **reactive canvas state** that changes _while the view is mounted_ (the user is still picking a DOM region):

| View          | Reactive canvas input             | Canvas callbacks                                 |
| ------------- | --------------------------------- | ------------------------------------------------ |
| `CreateAlert` | `locked`, `selector`, `matchText` | `onselectorchange`, `onclearselection`           |
| `SaveAlert`   | `selector`, `matchText`           | `onsave` (just `clearSelection`)                 |
| `EditAlert`   | —                                 | `onselectorchange`, `onclearselection`, `onsave` |

Spreading these through `router.props` would freeze them at navigation time — `selector` would never update as the user picks. So canvas state **cannot** go through the router. It needs its own reactive channel.

**Decision: expose canvas as a context singleton**, exactly like `router` and `toaster` (CLAUDE.md documents this as the project's convention). Canvas-consuming views call `getCanvas()` and read `canvas.state.selector` reactively / call `canvas.setSelector()` directly, instead of receiving snapshot props + callbacks. The `onselectorchange`/`onclearselection`/`onsave` callback props disappear — they were always just thin wrappers over canvas methods.

This cleanly separates the two concerns: **router.props = async data + navigation params; canvas context = live picker state.**

## Steps

### 1. Canvas becomes a context singleton

In [canvas.svelte.ts](../extension/src/lib/canvas.svelte.ts), add `export const [getCanvas, setCanvas] = createContext<Canvas>()` (mirror router/toaster). In App, after `initCanvas(...)`, call `setCanvas(canvas)`.

### 2. `load()` must be a module-level export, not an instance export

**Critical.** The router calls `this.views[view]?.load` — a property on the _component value_. In Svelte 5, `export function load()` inside the normal `<script>` is a **per-instance** export, not a static on the component constructor. It will be `undefined` on `router.views[view]`.

`load()` must live in `<script module>`:

```svelte
<script module lang="ts">
  export async function load(): Promise<Props> { ... }
</script>
```

Verify the `ViewComponent & { load? }` type in [router.svelte.ts](../extension/src/lib/router.svelte.ts) actually resolves against a module export (svelte-check). Fix [ListChanges.svelte](../extension/src/lib/views/ListChanges.svelte) — its `load()` is currently an instance export and needs moving to `<script module>`. (Note: `Props` is declared in the instance script; either duplicate the shape or hoist the type to module scope so `load()` can reference it.)

### 3. Rework the canvas-consuming views to read context

For `CreateAlert`, `SaveAlert`, `EditAlert`: drop the canvas-state and callback props from `interface Props`; instead `const canvas = getCanvas()` and read `canvas.state.*` / call `canvas.setSelector()` / `canvas.clearSelection()`. After this:

- `CreateAlert` Props → empty (or just nav params).
- `SaveAlert` Props → `url` only (and `url` can come from `getCanonicalURL()` in a `load()` or directly).
- `EditAlert` Props → `event` only (the nav param).

### 4. Per-view `load()` implementations

- `ListChanges.load()` → `{ events, runs }` (already drafted; move to `<script module>`).
- `ListAlerts.load()` → `{ events }` (calls `scheduled(getCanonicalURL())`).
- `CreateAlert` / `SaveAlert` / `EditAlert` → no `load()`. **Decision:** `SaveAlert` gets `url` from an inline `getCanonicalURL()` call in the view (synchronous and cheap — no async hop).

### 5. Collapse the ladder in App.svelte

Replace lines 87–115 with the single `<router.view {...router.props} />` already on line 85. Remove `events`, `runs`, `loadData()`, the view imports used only by the ladder, and `getCanonicalURL`/`scheduled`/`history`/`emptyPage` imports now unused in App.

### 6. Initial load + reload-on-auth

`navigate()` never runs at boot, so the default view (`listChanges`) won't auto-`load()`. And App currently re-runs `loadData()` when auth flips to `authenticated` (the `$effect` on lines 63–67). Both behaviors must be preserved:

- **Boot:** call `router.navigate(router.current)` once at startup (or add `router.reload()` that re-invokes the current view's `load()` and merges).
- **Auth change:** the `$effect` watching `authState.status` calls `router.reload()` instead of `loadData()`.

Add a `reload()` method to the Router that re-runs `views[current].load(props)` and merges — `navigate()` can delegate to it to avoid duplication.

### 7. Loading & error states

`navigate()` currently awaits `load()` with no error handling; a rejection is unhandled (callers fire-and-forget). **Decision: toaster + loading flag.**

- Add a `router.loading` `$state` flag: set `true` before awaiting `load()`, `false` in a `finally`. The shell can show a spinner while it's `true`.
- Wrap `load()` in try/catch in the router; on error surface via the toaster. The router doesn't sit under the `Toaster` context provider, so pass it a handler rather than calling `getToaster()` — e.g. App assigns `router.onerror = (e) => toaster.error(...)`, mirroring the existing `router.onchange` hook. (Confirm the toaster instance is reachable where `router` is configured in App.)

## Open questions

- **`router.props` typing**: still `any`. Worth tightening per-view now, or leave for later? (Lean: leave for later — out of scope for this refactor.)

## Out of scope

- Changing the `View` union or adding views.
- The auth/JWT refactor (separate plan, [auth-jwt-exchange.md](./auth-jwt-exchange.md)).
