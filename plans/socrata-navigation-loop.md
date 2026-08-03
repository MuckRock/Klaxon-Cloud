# Stop the self-driven navigation loop on Socrata (#94)

## Status

**Implemented** on branch `94-socrata` (95 unit tests, `check`, `lint`, and the
Chrome build green). Diagnosis verified against the code and against the live Cook
County page (see "Confirmed facts"). Three changes in `canvas-client.svelte.ts` +
`url.ts`, one test-harness fidelity fix, seven new tests. No view changes.

The three new `canvas-client` tests were confirmed to **fail against the
pre-fix client** — 6 `chrome.tabs.update` calls for the mounted effect (the
runaway loop itself), 2 for the direct-call and re-entrancy cases. Not yet
validated by hand against a live Socrata page; that's the remaining step.

## Why

Opening or editing an alert drives the tab to the alert's `site`
(`navigateTab`). On Socrata that navigation repeats forever: each load re-runs an
expensive SQL query and rewrites a long URL, which is what the reporter saw. It
isn't Socrata redirecting — **Klaxon is navigating the tab, over and over.**

Two things combine:

1. **The `$effect` in `ViewAlert`/`EditAlert` subscribes to state its own
   navigation writes.** `ViewAlert.svelte:37-51` (and `EditAlert.svelte:41-55`)
   calls `canvas.navigateTab(site)` inside `void (async () => …)()`. An async
   function's body runs synchronously up to its first `await`, so
   `navigateTab`'s prologue (`canvas-client.svelte.ts:290-294`) executes inside
   the effect's tracking context, and its reads of `this.#pinnedTab` and
   `this.url` — both `$state` — become effect dependencies. The navigation then
   writes both: `#resolve` sets `this.url` and reassigns `#pinnedTab`
   (`:390-407`), and the `getPage` round-trip overwrites `this.url` again
   (`:482`).

   This re-arms on **every** reconnect, on every site, not just Socrata:
   `#resolve` assigns `this.#pinnedTab = this.#connectedTab`, a _fresh object_,
   so the effect invalidates on identity even when nothing about the URL changed.
   `viewAlert` and `editAlert` are both in `SELECTION_VIEWS`
   (`App.svelte:48-49`), so they are always pinned when this runs.

2. **The "am I already there?" guard can't latch on Socrata.** The guard is
   `sameDocument(this.url, url)`, and `this.url` holds whatever the page
   _claims_ is canonical via `getCanonicalURL()` (`url.ts:2-20`), returned
   verbatim. On the alert's page that's a **relative** href naming a **different
   document**, so `canonicalize()`'s bare `new URL(raw)` throws, `sameDocument`
   degrades to string equality (`:115-121`), and the comparison can never be
   true.

Guard never true ⇒ every effect re-run issues a fresh `chrome.tabs.update` ⇒ full
load ⇒ `getPage` reports the same mismatched canonical ⇒ repeat.

The important consequence: **`sameDocument` is the only thing standing between
Klaxon and an infinite navigation loop on any page.** Nobody intended it to carry
that weight — `1b3a97a "Compare by document, not raw string, in navigateTab"` was
already a patch to this same failure mode after #71. Socrata is the third page to
find the seam. So the loop gets fixed at the cycle, not at the guard.

## Confirmed facts

Verified with `curl` on 2026-08-03:

- `…/cjeq-bs86/explore/query/…/page/filter` (the URL in the issue) serves
  `<link rel="canonical" href="/Health-Human-Services/…/cjeq-bs86/data"/>` —
  relative, **and** a different document. No `og:url`.
- `…/cjeq-bs86/data` serves an _absolute_ canonical pointing at a **third** URL
  (`…/cjeq-bs86`, no `/data`). So an alert saved on the ordinary dataset page
  loops the same way, and absolutizing the canonical does not help it. This is
  why change 3 is a correctness fix, not the loop fix.

## Resolved decisions

1. **Break the cycle inside `navigateTab`, not at each call site.** `untrack` at
   the call site leaves the trap armed for the next caller, and
   "async-prologue-runs-in-the-tracking-context" is exactly the kind of hazard
   that gets silently re-broken.
2. **Leave the views' `$effect` alone.** Moving to `onMount` would need a
   synchronous callback to keep the `clearSelection` teardown, and would drop
   re-navigation if a mounted `ViewAlert` ever receives a new `event` prop —
   today every route change swaps the component at `App.svelte:89`, but
   `router.replace` makes that a same-component transition away.
3. **Guard on the tab's live URL, not on a remembered target.** A `#navigatedTo`
   field would go stale: open alert A → tab lands there → user clicks a link on
   the page → back to the list → reopen alert A → the guard wrongly no-ops and
   `setSelector` runs against the wrong document. Asking `chrome.tabs.get` is
   authoritative, isn't `$state`, and putting it behind an `await` is what moves
   the prologue out of the tracking context.
4. **Don't split `url` into `tabUrl`/`canonicalUrl` yet.** Real, but a separate
   change — see "Out of scope".

## Changes by file

### `extension/src/lib/canvas-client.svelte.ts`

Rewrite `navigateTab`'s prologue (`:289-306`). Two reactive reads go away and an
in-flight flag comes in:

```ts
// Non-reactive: an in-flight navigation, so two effect runs in the same tick
// can't both drive the tab.
#navigating = false;

async navigateTab(url: string): Promise<void> {
  if (this.#navigating) return;
  // Callers reach us from inside an $effect, and an async function's body runs
  // synchronously up to its first await — so a $state read here would subscribe
  // that effect to state this navigation itself writes, and the effect would
  // re-run and navigate again, forever (#94). Keep this prologue untracked.
  const target = untrack(() => this.#pinnedTab) ?? this.#connectedTab;
  if (!target) return;

  this.#navigating = true;
  try {
    // Ask the tab where it actually is rather than trusting the mirrored `url`,
    // which holds the page's *self-reported* canonical and can name a different
    // document entirely (#94). Comparing by document ignores fragment and a
    // trailing slash, as before.
    const current = await chrome.tabs.get(target.id).catch(() => undefined);
    if (current?.url && sameDocument(current.url, url)) return;

    this.#disconnect();
    this.watchable = false;
    await this.#awaitTabComplete(target.id, url);
    await this.#connectInjected(target.id);
  } finally {
    this.#navigating = false;
  }
}
```

Details that are easy to get wrong:

- `#navigating` must be set **before** the `await chrome.tabs.get`, not after.
  Set it after, and two calls in the same tick both clear the check, both await,
  and both navigate.
- The `try` must wrap the guard's early `return` too, so the flag always clears.
- Keep the teardown (`#disconnect` / `watchable = false`) _after_ the guard, as
  today — a no-op call must not drop the port.
- `untrack` is already imported elsewhere in the extension (`App.svelte`,
  `SaveAlert.svelte`); import it from `svelte` here.

### `extension/src/lib/url.ts`

Resolve the advertised canonical against the document before returning it, so a
relative href becomes a real URL instead of a bare path:

```ts
function absolute(href: string): string | null {
  try {
    return new URL(href, window.location.href).href;
  } catch {
    return null;
  }
}
```

`getCanonicalURL()` runs `og:url`, then `link[rel=canonical]`, through
`absolute()`, and falls through to the next candidate (ultimately
`window.location.href`) when it returns null. Keep the existing per-branch
`try/catch` around the DOM queries; a malformed href must fall _through_, not
abort into a different branch.

This does not fix the loop on its own — Socrata's canonical still names a
different page — but it fixes the stored-`site` corruption below and stops
`canonicalize()` throwing.

## Related defect this also fixes

`SaveAlert` seeds its URL field from `canvas.url` (`SaveAlert.svelte:51`) and
saves it as `params.site` (`:64`). On these pages that's the bare path
`/Health-Human-Services/…/data`, so an alert created there is **stored with a
relative URL** and the form visibly shows a broken one. That isn't cosmetic: the
backend re-fetches `site` server-side, so those alerts can never run. Change 3
stops new ones being created; already-saved ones need a data pass (see below).

## Testing

### `extension/src/lib/tests/canvas-client.test.ts` — harness fidelity first

The mock's `tabs.update` ignores its arguments (`:108`) and `tabs.get` returns a
tab whose `url` never changes, so nothing today models "the tab is now at the URL
we drove it to." Make `update` mutate the fake tab:

```ts
update: vi.fn(async (_id: number, props: { url?: string }) => {
  if (props?.url) tab.url = props.url;
}),
```

Then drop the now-wrong pre-sets of `mock.tab.url` in the `navigateTab` tests
(`:407-408` and the title test) — those exist only because `update` was inert.
`mock.page.url` (what `getPage` reports) stays independent, which is the whole
point. The `navigateTab url normalization` block (`:520-558`) sets `tab.url` and
`page.url` together via `clientAt`, so it keeps passing against the new guard.

New cases:

- **Guards on the tab's real URL, not the reported canonical:** connect with
  `page.url` set to a foreign canonical (`"/Health-Human-Services/…/data"`),
  navigate to the alert's `site`, let it settle, call `navigateTab(site)` again →
  `chrome.tabs.update` called exactly **once**.
- **Re-entrancy:** two `navigateTab(site)` calls without awaiting the first →
  one `update`.

### The loop itself

The cheap assertions above don't prove the effect stopped re-running. For that,
mount the view's effect verbatim: `$effect.root` only works in a rune module, and
`vitest.config.ts` collects `src/**/*.test.ts`, so put the harness in
`src/lib/tests/effect-harness.svelte.ts` (not collected as a test, compiled by
the svelte plugin) exporting something like `runEffect(fn): () => void`, and
drive it from `canvas-client.test.ts` with `flushSync`. Assert one
`chrome.tabs.update` for a page reporting a mismatched canonical. Cap the fake
navigation so a regression fails the assertion instead of hanging the runner.

### `extension/src/lib/tests/url.test.ts`

Every existing case uses an absolute href. Add: relative `link[rel=canonical]` →
absolutized against `location.href`; relative `og:url` → same; malformed href →
falls back to `location.href`.

### Manual

Open the alert from the issue on a Socrata page: the tab loads it **once** and
the URL stops churning. Then create an alert on `…/cjeq-bs86/data` and confirm
the URL field shows an absolute URL.

## Out of scope (worth filing)

- **`url` is doing two jobs** — "which document am I looking at" (the guard) and
  "what should we store as `site`" (alert creation). Socrata is a case where the
  canonical answers neither well, and the code is already inconsistent:
  `#resolve:391` sets `origin` from the raw tab URL, then `:482` overwrites `url`
  with the canonical, so the two can disagree. Splitting into a raw `tabUrl`
  (guard + `origin`) and a `canonicalUrl` (SaveAlert's default) is cleaner than a
  "ignore the canonical unless it's same-document" heuristic. Not needed for this
  fix, since the guard stops reading `url` at all.
- **A cross-origin canonical** still poisons the stored `site` and the origin
  filter. Absolutizing doesn't make the canonical trustworthy.
- **Existing bad data.** Alerts whose `site` doesn't start with `http` are dead
  server-side. Worth a query and a repair pass, outside the extension.

## Biggest risk

The fix is invisible in the type system. Nothing stops a future refactor from
reading `$state` in `navigateTab`'s prologue — or from `await`ing something new
ahead of the `untrack` — and re-arming the identical bug, for the third time. The
comment plus the effect-level regression test are the only guards, which is the
argument for making that test a real one in the repo rather than a scratch
reproduction.
