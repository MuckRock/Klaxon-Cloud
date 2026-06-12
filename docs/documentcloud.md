# The DocumentCloud Add-On backend

DocumentCloud is the system of record and the orchestrator. Everything here lives
in the [`addons` app](https://github.com/MuckRock/documentcloud/tree/master/documentcloud/addons)
of [`MuckRock/documentcloud`](https://github.com/MuckRock/documentcloud). Klaxon
is **not special** to DocumentCloud — it's one Add-On among many, and this whole
subsystem is generic. Klaxon-specific behavior lives entirely in the Add-On
script and the extension.

Key files:

- [`models.py`](https://github.com/MuckRock/documentcloud/blob/master/documentcloud/addons/models.py) — `AddOn`, `AddOnEvent`, `AddOnRun`, plus GitHub linkage.
- [`tasks.py`](https://github.com/MuckRock/documentcloud/blob/master/documentcloud/addons/tasks.py) — the Celery tasks: `dispatch_events`, `dispatch`, `find_run_id`, `set_run_status`, `cancel`, `update_config`.
- [`views.py`](https://github.com/MuckRock/documentcloud/blob/master/documentcloud/addons/views.py) — the REST API viewsets and filters, plus the GitHub webhook and the file server.
- [`serializers.py`](https://github.com/MuckRock/documentcloud/blob/master/documentcloud/addons/serializers.py), [`choices.py`](https://github.com/MuckRock/documentcloud/blob/master/documentcloud/addons/choices.py).

The data models are summarized in [architecture.md](./architecture.md#shared-data-model);
this page focuses on the **API** and the **orchestration**.

## The API surface

All under `/api/`. Authenticated with the DocumentCloud JWT the extension mints
(see [extension.md](./extension.md#authentication)). The extension uses four
endpoints; here's the full relevant set.

### `addon_events/` — alerts

`AddOnEventViewSet`. CRUD over alerts.

- `GET addon_events/` — list the user's viewable events. Filters: `addon`,
  `site`, `domain`. Supports `?expand=addon`.
- `POST addon_events/` — create an alert. **Side effect:** if the new event's
  schedule is hourly/daily/weekly, `perform_create` immediately calls
  `instance.dispatch()` — so **a freshly created alert runs once right away**,
  not only on its next scheduled tick. A `disabled` (0) event is stored but not
  dispatched.
- `PATCH addon_events/<id>/` — update parameters/schedule. Setting `event: 0`
  disables it. (Re-enabling and changing schedule are the same PATCH.)
- The serializer exposes `id, addon, user, parameters, event, scratch,
  created_at, updated_at`. `user` is read-only (set to the requester).

### `addon_runs/` — runs (changes)

`AddOnRunViewSet`. `lookup_field = "uuid"`.

- `GET addon_runs/` — list viewable runs, newest first. Filters: `addon`,
  `event`, `dismissed`, `site`, `domain`, and **`message`** (exact match).
  Supports `?expand=addon,event`. The extension always passes
  `message=Change detected` to get only change-detecting runs.
- `POST addon_runs/` — create a one-off (manual) run. **Side effect:**
  `perform_create` validates the parameters against the Add-On's JSON schema, then
  dispatches a run with no `event`. *The Klaxon extension does not use this* — it
  always works through events — but the Add-On SDK and other Add-Ons do.
- `PATCH addon_runs/<uuid>/` — update `message`, `progress`, `data`,
  `file_name`, `rating`, `comment`, etc. **This is the endpoint the Add-On script
  calls back into** to report progress and store results.
- File handling: with `?upload_file=<name>` the serializer returns a
  `presigned_url` (S3 PUT) so the Add-On can upload its diff; `file_url` returns a
  download link (via the `addon-run-file` endpoint) while the file is unexpired.

### `addons/` — the program

`AddOnViewSet`. The extension reads this (via `expand=addon`) to get Klaxon's
`name`, `parameters` schema, etc. Mostly read-only to users; the writable bit is
`active` (whether the Add-On is "pinned" for you).

### `messages/` — email

Not in the `addons` app, but the Add-On SDK's `send_mail()` POSTs here
(`{subject, content}`) to email the user. This is how Klaxon's email alerts are
sent — through DocumentCloud, addressed to the user's account email.

### Site and domain filters

Both `addon_events` and `addon_runs` support filtering by the watched URL, backed
by partial expression indexes on `AddOnEvent.parameters`:

- **`site`** — case-insensitive exact match on `parameters.site`.
- **`domain`** — matches the **origin** (scheme + host) of `parameters.site`,
  e.g. `https://www.nifc.gov`. Implemented with a `SiteOrigin` SQL function and a
  matching index so the filter and index can't drift.

For runs, these filter on the **event's** parameters
(`event__parameters__site`), since a run's own parameters aren't where the site
lives.

## Orchestration: how a run happens

### Scheduling (`dispatch_events`)

[`dispatch_events`](https://github.com/MuckRock/documentcloud/blob/master/documentcloud/addons/tasks.py)
is a periodic Celery task. Its design is worth understanding because it's
non-obvious:

- It's intended to run on a **5-minute crontab** (Celery beat). **⚠️ Unclear:**
  the exact beat schedule is in DocumentCloud settings, which weren't examined;
  the every-5-minutes cadence is inferred from the code's bucketing math and
  comments. Flagged in [open-questions.md](./open-questions.md).
- Time is divided into 5-minute **buckets**: 12 per hour, 288 per day, 2016 per
  week.
- Each event is deterministically assigned a bucket by its **database id**:
  `id % 12` (hourly), `id % 288` (daily), `id % 2016` (weekly). On each tick, the
  task computes the current bucket for each cadence and dispatches every event
  whose `id % N` matches.

The consequence: an **hourly** alert runs once per hour, but the specific
5-minute slot within the hour is fixed by its event id (not by when you created
it). This **spreads load** evenly across each period instead of stampeding all
events at the top of the hour. Two alerts can run at different minutes purely
because of their ids.

### Dispatch (`AddOnEvent.dispatch` → `dispatch` task → `AddOn.dispatch`)

When an event is due (or just created, or manually triggered):

1. **`AddOnEvent.dispatch()`** opens a transaction, creates an `AddOnRun`
   (`status="queued"`, `dismissed=True`, linked to the event and user), and — on
   commit — enqueues the Celery `dispatch` task with the run's uuid, the user,
   the (empty, for Klaxon) document list, and the event's parameters.
2. **The `dispatch` Celery task** loads the `AddOn` and user and calls
   `AddOn.dispatch(...)`, then enqueues `find_run_id` to start tracking the
   GitHub run. Failures retry with backoff; exhausted retries mark the run
   `failure`.
3. **`AddOn.dispatch()`** does the actual GitHub call:
   - It first fetches **per-user tokens** from Squarelet
     (`get_tokens` → `/api/refresh_tokens/<user.uuid>/`): a DocumentCloud access
     token + refresh token **scoped to the end user**. This is what lets the
     Add-On act *as that user* when it calls back into the API.
   - It builds a `client_payload` containing those tokens, the API/auth base
     URLs, the run `id` (uuid), `addon_id`, `documents`, `query`, the user's
     `parameters` as `data`, `user`, `organization`, and **`event_id`**.
   - It POSTs to the GitHub repo's `/dispatches` endpoint with
     `event_type = <AddOn.name>` and that payload — a
     **`repository_dispatch`** event. GitHub authentication uses the Add-On's
     GitHub App installation token.

The payload has a `version` (1 vs 2) that only changes how it's nested to stay
under GitHub's 10-key `client_payload` limit; v2 puts the `id` at the top level
for backward compatibility. The fields delivered are the same.

> The presence of **`event_id`** in the payload is what makes
> `scratch`/event-data work: the Add-On uses it to read and write the event's
> `scratch` between runs. Manual one-off runs (`POST addon_runs/`) omit it, so
> they have no cross-run memory.

### Tracking the GitHub run

After dispatch, DocumentCloud doesn't yet know which GitHub Actions run is
"theirs." It finds out by polling:

- **`find_run_id`** lists recent workflow runs via the GitHub API and inspects
  each job's steps. The reusable workflow echoes the run uuid as the **name of
  the job's second step**, so DocumentCloud matches its uuid to the right GitHub
  `run_id`. (Results are cached briefly to limit GitHub API calls.)
- **`set_run_status` / `AddOnRun.set_status`** then polls that run's status and
  mirrors it onto the `AddOnRun`: `queued`/`in_progress`, then the GitHub
  `conclusion` (`success`/`failure`/`cancelled`) when completed. It keeps polling
  every few seconds until terminal.

### Auto-disable on repeated failure

In `set_status`, if a run belongs to an event and the **last 5 runs for that
event all failed/cancelled**, DocumentCloud disables the event (sets
`event = disabled`), logs it in an `AddOnDisableLog`, and emails the user that
their scheduled Add-On was disabled. (The disable can be reverted from the log.)

### Cancellation

`DELETE addon_runs/<uuid>/` enqueues the `cancel` task, which calls the GitHub
API to cancel the workflow run if it's still `queued`/`in_progress`.

## Config sync and GitHub integration

- **`update_config`** (task) pulls the Add-On repo's `config.yaml` via the GitHub
  API and loads it into `AddOn.parameters` (this is where the `site`/`selector`/…
  parameter schema, title, and description come from). It's triggered on repo
  changes.
- **`github_webhook`** (view) handles GitHub App install/uninstall and push
  events, maintaining `GitHubAccount` / `GitHubInstallation` rows and kicking off
  `update_config`. Signature-verified with `GITHUB_WEBHOOK_SECRET`.
- GitHub App installation tokens are minted on demand (JWT signed with the app's
  private key) and cached.

## File storage

When the Add-On uploads `diff.html`:

1. It requests `addon_runs/<uuid>/?upload_file=diff.html`, getting back a
   presigned S3 **PUT** URL, and uploads the file there.
2. It then PATCHes the run's `file_name`.
3. Download is served by `AddOnRunFileServer` at the `addon-run-file` route: it
   checks the requester can view the run, then redirects to a presigned S3 **GET**
   URL (or returns `{location}` JSON if `Accept: application/json`).

Files expire (`file_expires_at`), so older runs' diffs may no longer be
downloadable even though the run record remains.
</content>
