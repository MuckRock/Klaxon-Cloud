<script module lang="ts">
  import type { Event, Page, Run } from "../types";

  import { scheduled, history } from "../api";
  import { getCanonicalURL } from "../url";
  import { emptyPage } from "../utils";

  export interface Props {
    events: Page<Event>;
    runs: Page<Run>;
  }

  // Runs via router.navigate()/reload() before the view renders.
  export async function load(): Promise<Props> {
    const url = getCanonicalURL();
    const [eventsRes, runsRes] = await Promise.all([
      scheduled(url),
      history(url),
    ]);
    return {
      events: eventsRes.data ?? emptyPage<Event>(),
      runs: runsRes.data ?? emptyPage<Run>(),
    };
  }
</script>

<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";

  import Link from "../components/Link.svelte";
  import RelativeTime from "../components/RelativeTime.svelte";
  import Welcome from "../components/Welcome.svelte";

  import { getRouter } from "../router.svelte";
  import { isEvent, getSiteLabel } from "../utils";

  let { events = emptyPage<Event>(), runs = emptyPage<Run>() }: Props =
    $props();

  const router = getRouter();

  let hasEvents = $derived(events.results.length > 0);
  let hasRuns = $derived(runs.results.length > 0);

  function getLabel(run: Run): string {
    const event = run.event;

    if (!isEvent(event)) {
      return "Unknown site";
    }

    return getSiteLabel(event);
  }

  const recentRuns = $derived(runs.results.slice(0, 6));
</script>

<div class="container list-changes">
  <main class="section">
    <Welcome>
      {#if !hasEvents}
        <div class="empty-state">
          <p class="empty-message">You don't have any alerts for this page.</p>
        </div>
      {:else}
        <div class="alerts-body">
          <p class="summary">
            You have <Link view="listAlerts">
              {events.results.length} alert{events.results.length === 1
                ? ""
                : "s"}
            </Link>
            for this page.
          </p>
          {#if hasRuns}
            <p>Here are the most recent changes:</p>
          {:else}
            <p>No changes have been recorded yet. Check back later.</p>
          {/if}

          <div class="table">
            {#each recentRuns as run (run.uuid)}
              <div class="table-row">
                <p class="row-title">
                  {#if run.data?.snapshot}
                    <a
                      href={run.data.snapshot}
                      class="link"
                      target="_blank"
                      rel="nooopener noreferer"
                    >
                      {getLabel(run)}
                    </a>
                  {:else}
                    <strong>{getLabel(run)}</strong>
                  {/if}
                </p>
                <div class="row-meta">
                  <span class="changed">
                    Changed: <RelativeTime date={new Date(run.created_at)} />
                  </span>
                  {#if run.data?.compare}
                    <a
                      class="view-changes"
                      href={run.data.compare}
                      target="_blank"
                      rel="noopener noreferer"
                    >
                      View changes
                    </a>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

          <Link view="listAlerts">
            View all your alerts for this page &#187;
          </Link>
        </div>
      {/if}
    </Welcome>
  </main>

  <footer class="button-row">
    <button class="btn-primary" onclick={() => router.navigate("createAlert")}>
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

  .alerts-body {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .summary {
    margin: 0;
    font-size: var(--font-md, 16px);
    line-height: 1.3;
    color: #0c1e27;
  }

  .row-title a,
  .row-title strong {
    color: var(--klaxon-color-link, #c41a4d);
  }

  .table {
    background: #fffefa;
    border: 1px solid var(--gray-2, #d8dee2);
    border-radius: 8px;
    overflow: hidden;
  }

  .table-row {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    padding: 1em;
  }

  .table-row + .table-row {
    border-top: 1px solid var(--gray-2, #d8dee2);
  }

  .row-title {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;

    /* Clamp long URLs/titles to two lines, then ellipsis. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;

    font-size: var(--font-sm, 14px);
    font-weight: 600;
    color: var(--klaxon-color-link, #c41a4d);
    text-decoration: underline;
    line-height: 1.3;
  }

  .row-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 12px;
  }

  .changed {
    color: #233944;
  }

  .view-changes {
    background: none;
    border: none;
    color: var(--klaxon-color-link, #c41a4d);
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
  }
</style>
