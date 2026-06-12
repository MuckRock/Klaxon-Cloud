# Open questions & things to verify

This is a first draft assembled by reading source across four repositories
(`Klaxon-Cloud`, `documentcloud`, `Klaxon`, `documentcloud-addon-workflows`) plus
the `python-documentcloud` SDK. The items below are things the code didn't make
fully clear, places where docs and code seem to disagree, or claims inferred
rather than confirmed. Resolve these in the next editing pass.

## Resolved

- ✅ **Empty selector (`""`) vs `*`** — confirmed a bug. The extension was saving
  `selector: ""` for whole-page alerts, which crashes the Add-On
  (`soup.select("")` raises). Fixed: the save paths now send `"*"`
  (`WHOLE_PAGE_SELECTOR`), and an `isWholePage()` helper treats both `"*"` and the
  legacy empty string as whole-page when displaying alerts. — see
  [extension.md](./extension.md#the-picker-selecting-what-to-watch).
- ✅ **OIDC → JWT exchange is implemented** — confirmed; it is the current shape,
  not a plan. `extension/CLAUDE.md` has been updated to describe the
  `{ oidc, jwt, userinfo }` tiers and two-tiered refresh. — see
  [extension.md](./extension.md#authentication).
- ✅ **`views/ListChanges.svelte` was dead code** — confirmed and **deleted**. The
  home view is `listAlerts`.

## Unconfirmed behaviors

1. **Does a user need to "activate" the Klaxon Add-On before creating alerts?**
   The extension references Klaxon purely by `MUCKROCK_KLAXON_ID` and creates
   events against it. DocumentCloud has an `active` ("pinned") concept per user.
   Unclear whether creating an `AddOnEvent` requires the Add-On to be active for
   the user, or whether being a default/public Add-On is enough. — see
   [architecture.md](./architecture.md#addon--the-program).

2. **Exact scheduler cadence.** `dispatch_events` is written assuming a 5-minute
   crontab, but the Celery beat schedule itself lives in DocumentCloud settings,
   which weren't read. Confirm it actually runs every 5 minutes. — see
   [documentcloud.md](./documentcloud.md#scheduling-dispatch_events).

3. **Bucketing fairness over time.** Because an event's run slot is `id % N`, the
   distribution depends on id allocation. Worth confirming there's no pathological
   clustering (e.g. if ids are assigned in bursts) and that this is considered
   acceptable. — see
   [documentcloud.md](./documentcloud.md#scheduling-dispatch_events).

## Things to flesh out in a later pass

4. **Production vs dev configuration.** `.env.example` points at
   `dev.squarelet.com` and the prod DocumentCloud API. The actual production
   `MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_CLIENT_ID`, and `MUCKROCK_KLAXON_ID` values
   (and where they're set in CI/release) aren't documented here.

5. **Error/empty/edge states in the UI.** Documented happy paths and the
   `disabled`/reactivate path. Not yet documented: what the user sees when a run
   is `failure`, when an alert is auto-disabled (the email exists, but is there
   in-extension feedback?), or when the diff file has expired.

6. **Squarelet `get_tokens` / `refresh_tokens` contract.** The doc states
   DocumentCloud fetches user-scoped tokens from
   `/api/refresh_tokens/<uuid>/` so the Add-On can act as the user. The exact
   scopes/lifetime of those tokens and the trust model weren't examined in
   Squarelet itself. — see
   [documentcloud.md](./documentcloud.md#dispatch-addonevent-dispatch--dispatch-task--addon-dispatch).

7. **`run-addon.yml` secret masking and exact steps.** The Add-On runner workflow
   was read via its published `@v1` raw file and summarized. Worth re-reading the
   pinned version actually in use to confirm step names (DocumentCloud's
   `find_run_id` depends on the run uuid being the **second step's name**) and
   the secret-masking behavior. — see [addon.md](./addon.md#how-its-invoked).

8. **File retention.** Uploaded `diff.html` files expire (`file_expires_at`), but
   the retention window isn't documented here. Confirm the configured lifetime.

9. **Legacy bookmarklet status.** `MuckRock/Klaxon` still ships the
   `bookmarklet/` entry point. Confirm whether it's deprecated in favor of the
   extension or still supported in parallel.

## Noticed while editing (not in scope, flagged for follow-up)

- The **Routing & views** section of `extension/CLAUDE.md` still describes a
  `load()`/`ViewEntry` data-loading pattern, but the current router
  (`router.svelte.ts`) registers bare components and views self-load via an
  internal `$effect`. The `load()` description appears stale and is worth a
  separate cleanup pass.
</content>
