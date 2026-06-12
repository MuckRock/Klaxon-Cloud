# Refactor the canvas from imperative DOM into a Svelte component

## Status

**Not started.** Planned on branch `35-refactor-canvas`.

## Is this worth it?

This is a **code-quality / consistency refactor — not a capability or bug fix.**
Nothing the canvas does today is blocked by being imperative, and no bug is fixed by
migrating. So the call is whether the maintainability win clears the regression risk.

**What it gets us:**

- **Consistency.** Everything else in the codebase is Svelte components with runes;
  `canvas.svelte.ts` is the one place a contributor must context-switch into
  `document.createElement` + `style.cssText` + manual `mount`/`unmount`.
- **A narrow but real simplification.** The imperative show/hide sync collapses into
  derived visibility — today the `editable` setter (lines 418–433) and the `show*`/`hide*`
  helpers manually keep five divs' `style.display` in sync with state, which is exactly the
  bug-prone glue Svelte exists to delete. Inline style strings also move to a scoped
  `<style>` block, and `destroy()` shrinks (the `mount(ApertureBar)`/`unmount` dance goes
  away).

**What it costs / risks:**

- **The risk is concentrated where the tests aren't.** The fiddly geometry — the
  dismiss-button corner-clamping (lines 169–193) and the clip-path cutout — is covered only
  by manual smoke; the characterization tests
  ([canvas.test.ts](../extension/src/lib/tests/canvas.test.ts)) mock geometry out and pin
  the **state machine**, which is the part that barely changes.
- **The geometry math doesn't get simpler** — it moves from imperative calls to `$derived`,
  plus a new `geometryVersion` concept.
- **Real manual QA surface:** 4+ views × hover/drag/click/read-only/scroll/resize.

**Decision guide:**

- **Worth doing if** the canvas will keep growing (more overlay states / picker
  affordances) — declarative wins compound, and the state-machine tests are now a permanent
  net regardless.
- **Defer if** the canvas is effectively stable and rarely touched — "it ain't broke," the
  risky positioning code isn't getting genuinely simpler, and the pending JWT-exchange work
  (flagged in CLAUDE.md) is higher-value.

If we proceed: **tighten the scope** — controller/view split only, preserve behavior
exactly (no sneaking in `ResizeObserver` or element-removal handling; those are separate
follow-ups, see below), and treat the manual geometry smoke-test as a required gate.

## What and why

[canvas.svelte.ts](../extension/src/lib/canvas.svelte.ts) is the interactive picker. It
does two unrelated jobs in one file:

1. **Logic/state** — reactive `$state` (active, editable, mouse, selector, matchText,
   locked, dragging, structured), the `window` event listeners (mousedown/move/up +
   capturing click, scroll/resize), and the `clearSelection`/`setSelector` API.
2. **Rendering** — it imperatively `document.createElement`s five overlay divs
   (dimming, hover outline, selection outline, dismiss button, drag rectangle), appends
   them to the shadow root, computes their pixel positions by hand (`positionAt`,
   `showSelection`, `clipPathCutout`), toggles `style.display`, and `mount()`s an
   `<ApertureBar>` into a hand-made mount point.

The goal is to move job 2 into a real Svelte component (`Canvas.svelte`) that renders the
overlays declaratively, leaving `canvas.svelte.ts` as pure logic/state.

## The core decision: controller + view, not one big component

The `Canvas` object is shared via the `getCanvas`/`setCanvas` context and consumed two
ways:

- **Svelte components** read `canvas.state.*` reactively and call `setSelector()` /
  `clearSelection()` — [SelectionPicker](../extension/src/lib/components/SelectionPicker.svelte),
  [EditAlert](../extension/src/lib/views/EditAlert.svelte),
  [ViewAlert](../extension/src/lib/views/ViewAlert.svelte),
  [EditSelection](../extension/src/lib/views/EditSelection.svelte),
  [SaveAlert](../extension/src/lib/views/SaveAlert.svelte),
  [SignIn](../extension/src/lib/views/SignIn.svelte).
- **Non-component code** holds the instance directly — [save.ts](../extension/src/lib/save.ts)
  (`ctx.canvas.clearSelection()`) and [App.svelte](../extension/src/lib/components/App.svelte)
  (`initCanvas()`, `setCanvas()`, `handleRouteChange` toggling `active`/`editable`,
  `onDestroy` → `destroy()`).

So folding everything into a single component is wrong: it would break the context API and
the non-component consumers, and a component instance doesn't expose reactive `state`
getters as cleanly. Instead:

- **`canvas.svelte.ts` (controller, kept).** Retains all reactive state, the window event
  listeners, and the full `Canvas` public API. Stops creating DOM; stores _geometry
  inputs_ as `$state` and lets the view derive positions.
- **`Canvas.svelte` (new view).** Reads the controller via `getCanvas()` and renders the
  five overlays + `<ApertureBar>` declaratively.

**Blast radius:** all six consumer components, `save.ts`, and the context wiring are
untouched. Only the canvas internals and App's markup change.

## The hard part: `getBoundingClientRect()` isn't reactive

Today `onScrollOrResize` re-runs `positionAt`/`showSelection` to re-glue overlays after the
page scrolls or resizes — there's no state change to react to, the _rects_ just move. The
view derives positions from `el.getBoundingClientRect()`, which Svelte can't track.

Fix: a `geometryVersion: number` `$state` counter on the controller. `onScrollOrResize`
becomes `bumpGeometry()` (increment the counter). Every `$derived` position/clip-path in
the view reads `geometryVersion` to establish a dependency, so a bump re-runs them.
Hover/selection/drag changes already re-run because they swap the source element/rect.

## Steps

### Step 1 — Strip imperative DOM from `canvas.svelte.ts`

Remove: the five `createElement` blocks + `shadow.appendChild`, the `apertureMountPoint` +
`mount(ApertureBar)`, `positionAt`, `showSelection`, the `hide*` style-toggling,
`clipPathCutout`, and the `unmount`/`.remove()` calls in `destroy()`.

Promote/add geometry state:

- `hoverEl: Element | null` → `$state` (currently a plain `let`).
- `selectionEl: Element | null` → `$state`.
- `dragRect: DOMRect | null` → `$state`, replaces imperative `dragDiv` styling.
- `apertureTarget` — already `$state`.
- `geometryVersion: number` → `$state`, bumped by `bumpGeometry()` (was `onScrollOrResize`).

Event handlers now **set state** instead of poking styles. This collapses:

- The `editable` setter's imperative show/hide (lines 418–433) → a plain `editable = v`
  write; visibility becomes the view's `$derived` concern.
- `showApertureBar`/`hideApertureBar` → plain `apertureTarget` writes (the `editable`
  guard moves to the view or stays as a guard on the setter).
- `setSelector` → drop `showSelection`/`showApertureBar`; just set `selectionEl`,
  `apertureTarget`, and the state fields.

Extend the type surface so the view can read the geometry. Either widen `Canvas` or add an
internal companion type exposing: `hoverEl`, `selectionEl`, `dragRect`, `apertureTarget`,
`geometryVersion`, `editable`, `sidebarWidth`, `host`, plus a `commit(el)` for the
ApertureBar `onselect` body (lines 131–139). The public `Canvas` consumers are unaffected.

`destroy()` shrinks to: remove window listeners + restore `userSelect`.

Decide during edit: the `shadow` param to `initCanvas` is no longer used for appending —
either drop it or keep it for signature stability. Leaning drop.

### Step 2 — Create `Canvas.svelte`

Reads `getCanvas()`. Renders, as siblings so nothing clips them:

- **dimming** — `clip-path` is `$derived` from `selectionEl` + `geometryVersion` (port
  `clipPathCutout`); shown when `selectionEl` is set.
- **hover** outline — positioned from `hoverEl`.
- **selection** outline — positioned from `selectionEl`.
- **dismiss button** — `onclick={canvas.clearSelection}`; visible when
  `editable && selectionEl`; position uses the corner-clamping `$derived` logic ported from
  `showSelection` (lines 169–193).
- **drag** rectangle — positioned from `dragRect`.
- `<ApertureBar target={canvas.apertureTarget} sidebarWidth={...} host={...}
onselect={canvas.commit} />`.

A shared `positionStyle(el, geometryVersion)` helper replaces `positionAt`. The inline
`style.cssText` strings move into a scoped `<style>` block; `var(--red-3)` etc. still
resolve because the component renders inside the shadow root under `:host` (defined in
App.svelte). The dimming/hover/drag colors that are currently hardcoded rgba stay as-is.

### Step 3 — Wire into `App.svelte`

Render `<Canvas />` at the **top level of App's markup** (sibling of `.sidebar`, not inside
it) so the overlays mount directly under the shadow root and aren't clipped by the fixed
sidebar. `initCanvas()` / `setCanvas()` / `handleRouteChange` / `onDestroy` are unchanged.

### Step 4 — Verify

- `npm run check` (svelte-check) and **`npm run build`** — the real gate; svelte-check
  alone has missed bundler-level breakage before (see router-view-loading.md gotcha 3).
- `npm test` (selector tests still pass; canvas has no direct tests).
- Manual smoke in Chrome (`chrome://extensions` → Load unpacked → `build/`):
  - hover → outline tracks the element;
  - drag-select → rect + live enclosing-element preview, commit on mouseup;
  - click-select → lock + dimming cutout + dismiss button with corner-clamping;
  - ApertureBar ancestor walk updates the selection;
  - scroll/resize keeps every overlay glued (the `geometryVersion` path);
  - read-only views (`editAlert`, `viewAlert`) hide the dismiss button + bar;
  - leaving a non-selection view clears the selection.

## Net effect

`canvas.svelte.ts` becomes pure logic/state (no DOM, no `mount`/`unmount`), `Canvas.svelte`
owns all rendering, the public context API and all consumers are unchanged, and
scroll/resize re-positioning becomes declarative via the `geometryVersion` signal. Update
the CLAUDE.md Canvas section to match once landed.

## Out of scope (possible follow-ups)

Keep these out of this refactor — they're behavior _changes_, and the characterization
tests are written to pin current behavior, not these:

- **Re-position on element-box changes (`ResizeObserver`).** Today overlays only re-glue on
  scroll/resize, not when the selected element itself reflows. A `ResizeObserver` on the
  selection/hover element could `bumpGeometry()` on box changes. Note `getBoundingClientRect`
  is never reactive regardless — any trigger just calls `bumpGeometry()`; the
  `geometryVersion` bridge stays.
- **Auto-clear when the selected element is removed (`MutationObserver`).** A
  `MutationObserver` is the _only_ one of these that fits this case (scroll/resize aren't DOM
  mutations, so it's the wrong tool for re-positioning). It could detect the locked element
  leaving the DOM and call `clearSelection()`. New feature, not current behavior.
