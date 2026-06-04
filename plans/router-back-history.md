# Navigation history on the Router

## Status

**Planned (2026-06-04), branch `33-history`.** A first cut of `#history` already
exists in [router.svelte.ts](../extension/src/lib/router.svelte.ts) but is
broken (see below). This plan fixes it so `back()` actually walks the stack and
restores props, and removes the hardcoded `view` from every `<BackLink>`.

## What and why

The back link today is a regular forward navigation: `<BackLink view="..." />`
calls `router.navigate(view, rest)` with a hardcoded destination
([BackLink.svelte](../extension/src/lib/components/BackLink.svelte)). Each call
site has to know where "back" goes, and any state from the previous view is
lost. We want the router to remember where you came from so `back()` returns
there — with its props intact — and `<BackLink>` no longer needs a destination.

## The bugs in the current `#history`

[router.svelte.ts:17-44](../extension/src/lib/router.svelte.ts#L17-L44) added
`#history: View[]` with `navigate()` pushing and `back()` popping, but it
doesn't work:

1. **It pushes the destination, not the origin.** `navigate()` does
   `this.#history.push(view)` — the view you're going _to_. So the top of the
   stack is always the view you're currently on; `back()` pops it and sets
   `current` to the same view. Nothing moves.
   - Trace: start `listChanges` (history `[]`) → `navigate("createAlert")`
     (history `["createAlert"]`, current `createAlert`) →
     `navigate("saveAlert")` (history `["createAlert","saveAlert"]`, current
     `saveAlert`) → `back()` pops `"saveAlert"`, sets current `saveAlert`. No-op.

2. **It stores only `View`, never props.** Backing into a view that needs nav
   params (`editAlert` needs an alert/event; `saveAlert` needs the picked
   selector) lands there with empty `props`.

3. **No empty-history handling.** The initial `current` (`listChanges`) is never
   pushed at boot, so a `<BackLink>` reachable on a freshly-loaded view has
   nothing to pop.

## Decisions

- **History stores full `{ view, props }` entries**, and `navigate()` pushes the
  state you're _leaving_ — the stack becomes a breadcrumb of prior states, and
  `back()` restores both view and props.
- **Shallow-copy props into history** (`{ ...this.props }`) so a view mutating
  `router.props` later can't corrupt a saved entry.
- **`<BackLink>` keeps an optional `fallback` view**, used only when the stack is
  empty (e.g. a view shown at boot). Back is never a dead button. The required
  `view` prop is removed.
- **No redo/forward stack.** Matches browser back-button behavior; out of scope.
- **No history cap.** A sidebar session is short; not worth the complexity.

## Steps

### 1. Rework the Router

In [router.svelte.ts](../extension/src/lib/router.svelte.ts):

```ts
type HistoryEntry = { view: View; props: Record<string, any> };

#history: HistoryEntry[] = $state([]);

navigate(view: View, props?: Record<string, any>) {
  this.#history.push({ view: this.current, props: { ...this.props } });
  this.current = view;
  this.props = props ?? {};
  this.onchange(view);
}

back(fallback?: View) {
  const previous = this.#history.pop();
  if (previous) {
    this.current = previous.view;
    this.props = previous.props;
    this.onchange(previous.view);
  } else if (fallback) {
    this.navigate(fallback);
  }
}

get canGoBack() {
  return this.#history.length > 0;
}
```

`onchange` still fires on both paths (keeps the canvas active/editable wiring in
[App.svelte](../extension/src/lib/components/App.svelte#L45-L48) correct).
`canGoBack` is there for `BackLink` to optionally hide itself.

### 2. Simplify `BackLink`

In [BackLink.svelte](../extension/src/lib/components/BackLink.svelte): drop the
required `view`, accept an optional `fallback`, call `router.back(fallback)`:

```svelte
const { fallback }: { fallback?: View } = $props();
...
onclick={() => router.back(fallback)}
```

### 3. Update the 4 call sites

Swap `view="..."` → `fallback="..."`:

- [CreateAlert.svelte:41](../extension/src/lib/views/CreateAlert.svelte#L41) → `fallback="listChanges"`
- [EditAlert.svelte:99](../extension/src/lib/views/EditAlert.svelte#L99) → `fallback="listChanges"`
- [ListAlerts.svelte:105](../extension/src/lib/views/ListAlerts.svelte#L105) → `fallback="listChanges"`
- [SaveAlert.svelte:67](../extension/src/lib/views/SaveAlert.svelte#L67) → `fallback="createAlert"` — and it now returns to `createAlert` with the picked-selector props intact, which the hardcoded forward-nav lost.

### 4. Test + verify

- Add `src/lib/tests/router.test.ts`: navigate twice, assert `back()` walks the
  stack and restores props; assert `back(fallback)` on an empty stack navigates
  to the fallback; assert `canGoBack`.
- `npm run check` + `npm run build` (the build is the real gate — `check`
  tolerates some Svelte issues the bundler rejects).

## Watch out for

- Views that complete an action with a forward `navigate("listChanges")`
  ([SaveAlert.svelte:55](../extension/src/lib/views/SaveAlert.svelte#L55),
  [EditAlert.svelte:66](../extension/src/lib/views/EditAlert.svelte#L66)) push
  onto history like any other navigation — that's fine, just be aware "back"
  from the resulting list view returns into the save/edit flow.
- The Header's view switching goes through `<Link>`
  ([Link.svelte](../extension/src/lib/components/Link.svelte)), which also calls
  `navigate()`, so those transitions land in history too — intended.

## Out of scope

- Changing the `View` union or adding views.
- A forward/redo stack or browser-history (`popstate`) integration.
