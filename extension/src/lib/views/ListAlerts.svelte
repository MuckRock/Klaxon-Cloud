<script lang="ts">
  import type { Event, Page, Run } from "@klaxon/lib/types";

  import { ArrowRight, BellOff } from "@lucide/svelte";

  import Link from "../components/Link.svelte";
  import Loading from "@klaxon/lib/components/Loading.svelte";
  import RelativeTime from "../components/RelativeTime.svelte";
  import Siren from "@klaxon/lib/components/Siren.svelte";
  import Welcome from "../components/Welcome.svelte";
  import { scheduled, history, schedules, update } from "../api";
  import { getCachedAlerts, setCachedAlerts } from "../alerts-cache";
  import { authState } from "../auth.svelte";
  import { getCanvas } from "../canvas-client.svelte";
  import { getRouter } from "../router.svelte";
  import { getToaster } from "../toaster.svelte";
  import { emptyPage, getSiteLabel, isEvent } from "@klaxon/lib/utils";

  const router = getRouter();
  const toaster = getToaster();
  const canvas = getCanvas();

  let events = $state<Page<Event>>(emptyPage<Event>());
  let runs = $state<Page<Run>>(emptyPage<Run>());

  let loadingAlerts = $state(true);

  $effect(() => {
    if (authState.status !== "authenticated") return;

    // The active tab's origin (resolved by the panel from chrome.tabs); the list
    // re-keys to it when the user switches tabs or navigates.
    const domain = canvas.origin;
    if (!domain) return;

    // Serve a previously-loaded origin from the cache so tab switches are
    // instant and don't refetch. Cache entries stay consistent with in-place
    // edits (they share objects) and are invalidated on create/edit.
    const cached = getCachedAlerts(domain);
    if (cached) {
      events = cached.events;
      runs = cached.runs;
      loadingAlerts = false;
      return;
    }

    let cancelled = false;

    // Cache miss: drop the previous origin's alerts so we show the loading state
    // rather than flashing the wrong page's list while this origin fetches.
    events = emptyPage<Event>();
    runs = emptyPage<Run>();
    loadingAlerts = true;

    Promise.all([scheduled({ domain }), history({ domain })]).then(([eventsRes, runsRes]) => {
      if (cancelled) return;

      loadingAlerts = false;

      // The API surfaces failures as a `.error` field rather than throwing.
      // Leave any already-loaded data in place rather than blanking it out.
      if (eventsRes.error || runsRes.error) {
        console.error("Failed to load alerts:", eventsRes.error ?? runsRes.error);
        toaster.error("Something went wrong loading your alerts.");
        return;
      }

      events = eventsRes.data ?? emptyPage<Event>();
      runs = runsRes.data ?? emptyPage<Run>();
      setCachedAlerts(domain, { events, runs });
    });

    return () => {
      cancelled = true;
    };
  });

  let hasEvents = $derived(events.results.length > 0);

  // Join each alert to its most recent change, then sort most-recent first.
  // `history()` returns runs newest-first, so the first run seen for an event
  // id is that alert's latest change. Alerts with no changes sink to the
  // bottom, ordered by when they were created.
  let rows = $derived.by(() => {
    const latest = new Map<number, Run>();
    for (const run of runs.results) {
      if (isEvent(run.event) && !latest.has(run.event.id)) {
        latest.set(run.event.id, run);
      }
    }

    return events.results
      .map((event) => ({ event, run: latest.get(event.id) }))
      .sort((a, b) => {
        if (a.run && b.run) {
          return new Date(b.run.created_at).getTime() - new Date(a.run.created_at).getTime();
        }
        if (a.run) return -1;
        if (b.run) return 1;
        return new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime();
      });
  });

  let loading: boolean = $state(false);
  let selected: Event[] = $state([]);

  let allSelected = $derived(rows.length > 0 && selected.length === rows.length);
  // Drives the header checkbox's indeterminate state (some but not all).
  let someSelected = $derived(selected.length > 0 && !allSelected);

  function toggleAll() {
    selected = allSelected ? [] : rows.map((r) => r.event);
  }

  // Label for the select-all control: reflects the current selection count.
  let selectionLabel = $derived(
    selected.length === 0 ? "Select all" : `${selected.length} selected`,
  );

  async function disable(toDisable: Event[]) {
    loading = true;
    const promises = toDisable.map((event) => update(event.id, "disabled", event.parameters));

    const results = await Promise.all(promises);

    // Write each updated event back into the rendered list.
    results.forEach(({ data }) => {
      if (data) {
        const index = events.results.findIndex((e) => e.id === data.id);
        if (index !== -1) {
          events.results[index] = data;
        }
      }
    });

    const failures = results.filter((r) => r.error);
    if (failures.length > 0) {
      console.error(
        "Disable alert(s) failed:",
        failures.map((f) => f.error),
      );
      toaster.error(
        failures.length === 1
          ? (failures[0].error?.message ?? "Failed to disable 1 alert.")
          : `Failed to disable ${failures.length} of ${toDisable.length} alerts.`,
      );
    } else {
      toaster.success(
        toDisable.length === 1 ? "Alert disabled." : `${toDisable.length} alerts disabled.`,
      );
    }

    loading = false;
    // Keep any failed alerts selected so the user can retry.
    selected = toDisable.filter((_, i) => results[i].error);
  }
</script>

<div class="container list-alerts">
  <main class="section">
    <Welcome>
      {#if loadingAlerts && !hasEvents}
        <div class="empty-state">
          <Loading message="Checking for alerts…" />
        </div>
      {:else if !canvas.watchable}
        <div class="empty-state welcome-empty">
          <Siren dimmed />
          <h3 class="empty-head">Can't watch this page</h3>
          <p class="empty-message">
            Klaxon can only watch ordinary web pages. Browse to a site to create an alert.
          </p>
        </div>
      {:else if !hasEvents}
        <div class="empty-state welcome-empty">
          <Siren dimmed />
          <h3 class="empty-head">No alerts</h3>
          <p class="empty-message">Create a new alert to watch this page for changes.</p>
        </div>
      {:else}
        <h3 class="alert-count">
          You have <span class="alert-count-value">
            {rows.length}
            {rows.length > 1 ? "alerts" : "alert"}
          </span> on this site.
        </h3>

        <div class="toolbar">
          <label class="select-all">
            <input
              type="checkbox"
              checked={allSelected}
              indeterminate={someSelected}
              onchange={toggleAll}
            />
            {selectionLabel}
          </label>

          <button
            type="button"
            class="disable"
            disabled={selected.length === 0 || loading}
            onclick={() => disable(selected)}
          >
            <BellOff size={14} />
            Disable
          </button>
        </div>

        <div class="table">
          {#each rows as { event, run } (event.id)}
            <div class="row">
              <input
                type="checkbox"
                value={event}
                bind:group={selected}
                aria-label={`Select ${getSiteLabel(event)}`}
              />
              <div class="row-body">
                <p class="row-title">
                  <Link view="viewAlert" {event} guard={() => canvas.requestWatch()}>
                    {getSiteLabel(event)}
                  </Link>
                </p>
                <p class="row-meta">
                  {#if run}
                    {#if run.data?.compare}
                      <a
                        class="changed-link"
                        href={run.data.compare}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Changed <RelativeTime date={new Date(run.created_at)} />
                      </a>
                    {:else}
                      Changed <RelativeTime date={new Date(run.created_at)} />
                    {/if}
                  {:else}
                    No changes yet
                  {/if}
                </p>
                <p class="row-meta">
                  Checks <span class="schedule {schedules[event.event]}">
                    {schedules[event.event]}
                  </span>
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Welcome>
  </main>

  <footer class="button-row">
    <button
      class="btn-primary"
      disabled={!canvas.watchable}
      onclick={async () => {
        if (await canvas.requestWatch()) router.navigate("createAlert");
      }}
    >
      Create a new alert
      <ArrowRight />
    </button>
  </footer>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  main,
  footer {
    padding: 1em;
  }

  main {
    flex: 1 1 auto;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: 1em;
    flex: 1 1 auto;
  }

  h3 {
    margin: 0;
    font-size: var(--font-lg, 20px);
    font-weight: 400;
    color: #0c1e27;
  }

  .alert-count-value {
    color: var(--klaxon-color-link);
  }

  .schedule {
    &.disabled {
      opacity: 0.7;
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    gap: 4px;
  }

  .empty-message {
    margin: 0 0 1em;
    font-size: var(--font-md, 16px);
    line-height: 1.3;
    color: #0c1e27;
  }

  .welcome-empty {
    gap: 0.5em;
  }

  .empty-head {
    margin: 0;
    font-size: var(--font-xl, 24px);
    font-weight: 600;
    line-height: normal;
    color: #0c1e27;
  }

  .welcome-empty .empty-message {
    margin: 0;
    text-wrap: pretty;
    line-height: 1.4;
  }

  button.disable {
    display: inline-flex;
    padding: 0.1875rem 0.5rem;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--orange-3, #ec7b6b);
    background: transparent;

    /* Ghost button: no fill, accent-colored text + icon (the lucide icon
       inherits color via currentColor). */
    color: var(--orange-3, #ec7b6b);
    text-align: center;
    cursor: pointer;

    /* Small Label */
    font-family: var(--font-sans, "Source Sans Pro");
    font-size: var(--font-sm, 14px);
    font-style: normal;
    font-weight: 600;
    line-height: normal;
  }

  button.disable:disabled {
    opacity: 0.5;
  }

  .table {
    background: #fffefa;
    border: 1px solid var(--gray-2, #d8dee2);
    border-radius: 8px;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .select-all {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: var(--font-sm, 14px);
    font-weight: 600;
    color: var(--gray-4);
    cursor: pointer;
  }

  .row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem 0.25rem;
  }

  .row + .row {
    border-top: 1px solid var(--gray-2, #d8dee2);
  }

  .row input[type="checkbox"] {
    margin-top: 0.125rem;
    flex: none;
  }

  .row-body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .row-title {
    margin: 0;
    min-width: 0;
  }

  /* The title is a Link (renders a button) that navigates to the alert.
     Clamp long URLs/titles to two lines, then ellipsis. */
  .row-title :global(.link) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-align: left;

    font-size: var(--font-sm, 14px);
    font-weight: 600;
    line-height: 1.3;
  }

  .row-meta {
    margin: 0.125rem 0 0;
    font-size: var(--font-xs, 12px);
    color: #233944;
  }

  .changed-link {
    color: var(--klaxon-color-link, #c41a4d);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
