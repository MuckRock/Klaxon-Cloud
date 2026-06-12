# How Klaxon works

Klaxon lets you monitor web pages for newsworthy changes. Pick a page (or part of a page), choose how often to check it, and Klaxon notifies you when that page or selection changes. Each detected change is backed by an Internet Archive snapshot and a visual diff.

This documentation maps out the **whole system, end to end**: the four moving parts, the data they exchange, and the lifecycle of an alert from creation to a detected change.

> **Status: first draft.** This was written by Claude, reading the source across several repositories. Where behavior was unclear or couldn't be confirmed from the code alone, it's flagged inline with **⚠️ Unclear** and collected in [open-questions.md](./open-questions.md) for a later editing pass.

## Start here

- **[architecture.md](./architecture.md)** — the four moving parts, how they connect, the shared data model, and a system diagram. Read this first.
- **[data-flow.md](./data-flow.md)** — step-by-step walkthroughs of the three core flows (create an alert, a scheduled run, detecting a change). This is the "how data moves between each part" map.

## Component deep-dives

- **[extension.md](./extension.md)** — the Klaxon Cloud browser extension (this repo): the picker UI, auth, and the API client.
- **[documentcloud.md](./documentcloud.md)** — the DocumentCloud Add-On backend: the data models, the API the extension talks to, scheduling, and how runs are dispatched to GitHub Actions.
- **[addon.md](./addon.md)** — the Klaxon Add-On script: what actually runs on a schedule to observe a site, diff it against the Internet Archive, and record a result.

## The four moving parts

| Part | Repo | Role |
| --- | --- | --- |
| **Browser extension** ("Klaxon Cloud") | [`MuckRock/Klaxon-Cloud`](https://github.com/MuckRock/Klaxon-Cloud) (this repo) | The user-facing UI. Pick a page region, create/edit/view alerts and changes. |
| **DocumentCloud server** | [`MuckRock/documentcloud`](https://github.com/MuckRock/documentcloud) | Stores alert configurations and run results; schedules and dispatches runs; serves the API. |
| **Klaxon Add-On** | [`MuckRock/Klaxon`](https://github.com/MuckRock/Klaxon) | The Python script that runs in GitHub Actions to observe a site and record a result. |
| **Squarelet** | [`MuckRock/squarelet`](https://github.com/MuckRock/squarelet) | MuckRock's shared identity provider (OIDC). Signs the user in and issues tokens. |

A fifth supporting piece is the **reusable GitHub Actions workflow**
([`MuckRock/documentcloud-addon-workflows`](https://github.com/MuckRock/documentcloud-addon-workflows)),
which is the harness that actually executes the Add-On script inside Actions.

## Terminology: the two vocabularies

The single most important thing to understand is that **the same two concepts go by different names** depending on whether you're looking at the DocumentCloud backend or the Klaxon user interface.

| DocumentCloud term | Klaxon UI term | What it is |
| --- | --- | --- |
| **Add-On Event** (`addon_events`) | **Alert** | A saved, scheduled monitoring configuration for one URL: the site, the CSS selector, the schedule, notification options. |
| **Add-On Run** (`addon_runs`) | **Change** (when something changed) | A single execution of the Add-On. The UI mostly surfaces only the runs that *detected a change*. |
| **Add-On** (`addons`) | (not surfaced) | The Klaxon program itself, registered once in DocumentCloud and pointed at the `MuckRock/Klaxon` GitHub repo. |

So: **an "alert" is an event, and a "change" is a run that found a difference.** The rest of these docs use whichever term fits the layer being described and cross-references the other.

## One-paragraph summary

The browser extension lets a signed-in user select a page region and save it as an **alert**. Saving an alert creates an **Add-On Event** in DocumentCloud via its API. DocumentCloud runs a scheduler that, on a cadence (hourly/daily/weekly), **dispatches** each due event: it creates an **Add-On Run** record and fires a GitHub `repository_dispatch` at the `MuckRock/Klaxon` repo. GitHub Actions runs the Klaxon **Add-On script**, which fetches the watched region from both the live site and its most recent Internet Archive snapshot, diffs them, and — if they differ — archives a fresh snapshot, emails/Slacks the user, and writes the result (timestamps, snapshot URL, comparison URL, an uploaded HTML diff) back onto the Run via the DocumentCloud API. The extension then reads those Runs back from the API to show the user their recent **changes**.
