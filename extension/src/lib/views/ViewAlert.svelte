<script lang="ts">
  import type { AddOnSchedule, Event, Run } from "../types";

  import PinnedTabNotice from "../components/PinnedTabNotice.svelte";
  import RelativeTime from "../components/RelativeTime.svelte";
  import { getRouter } from "../router.svelte";
  import { history, schedules } from "../api";
  import { getRunLabel, getSiteLabel, isEvent, isWholePage } from "../utils";
  import { getCanvas } from "../canvas-client.svelte";

  interface Props {
    event: Event;
  }

  let { event }: Props = $props();

  const router = getRouter();
  const canvas = getCanvas();

  let selector = $derived(event.parameters.selector);
  let wholePage = $derived(isWholePage(selector));
  let frequency: AddOnSchedule = $derived(schedules[event.event] ?? "weekly");

  // True when the canvas is pinned to a different tab than the one being viewed
  // (PinnedTabNotice surfaces this). Editing an alert means picking/scrolling on
  // its page, which we can't do from another tab — so block the edit actions.
  let away = $derived(canvas.away);

  let runs: Run[] = $state([]);
  let loading = $state(true);

  $effect(() => {
    // Drive the tab to the alert's page first, then show its selection there —
    // the list is domain-filtered, so the alert may live on a different path
    // than the tab we opened from. (Captured up front; navigateTab is async.)
    const site = event.parameters.site;
    const sel = selector;
    const whole = wholePage;
    void (async () => {
      await canvas.navigateTab(site);
      if (!whole) void canvas.setSelector(sel);
    })();
    return () => {
      canvas.clearSelection();
    };
  });

  $effect(() => {
    loadRuns(event.id, event.parameters.site);
  });

  async function loadRuns(eventId: number, site: string) {
    loading = true;
    const { data } = await history({ site, event: eventId, per_page: 10 });
    if (data) {
      runs = data.results.filter(
        (r) => isEvent(r.event) && r.event.id === eventId,
      );
    }
    loading = false;
  }
</script>

<div class="container alert-detail">
  <main class="section content">
    <PinnedTabNotice />
    <div class="intro">
      <h3>{getSiteLabel(event)}</h3>
      <p class="description">
        This alert is watching <strong>
          {wholePage ? "the entire page" : "part of the page"}
        </strong> for changes.
      </p>
      <button
        type="button"
        class="edit-selection-link"
        disabled={away}
        onclick={() =>
          router.navigate("editSelection", { event, origin: "viewAlert" })}
      >
        Edit selection
      </button>
    </div>

    <dl class="details">
      <dt>URL</dt>
      <dd class="site">
        <a href={event.parameters.site} class="link">
          {event.parameters.site}
        </a>
      </dd>
      <dt>Frequency</dt>
      <dd>{frequency}</dd>
      {#if event.parameters.slack_webhook}
        <dt>Slack</dt>
        <dd>Notifications enabled</dd>
      {/if}
      <dt>Created</dt>
      <dd><RelativeTime date={new Date(event.created_at)} /></dd>
      <dt>Updated</dt>
      <dd><RelativeTime date={new Date(event.updated_at)} /></dd>
    </dl>

    <div class="runs">
      <h4>Recent changes</h4>
      {#if loading}
        <p class="description">Loading recent changes…</p>
      {:else if runs.length === 0}
        <p class="description">
          No changes have been recorded for this alert yet.
        </p>
      {:else}
        <div class="table">
          {#each runs as run (run.uuid)}
            <div class="table-row">
              <p class="row-title">
                {#if run.data?.snapshot}
                  <a
                    href={run.data.snapshot}
                    class="link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getRunLabel(run)}
                  </a>
                {:else}
                  <strong>{getRunLabel(run)}</strong>
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
                    rel="noopener noreferrer"
                  >
                    View changes
                  </a>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </main>

  <footer class="button-row">
    <button
      class="btn-primary"
      type="button"
      disabled={away}
      onclick={() => router.navigate("editAlert", { event })}
    >
      Edit alert
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

  .content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .intro {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h3 {
    margin: 0;
    font-size: var(--font-lg, 20px);
    font-weight: 700;
    color: #0c1e27;

    /* Clamp long URLs/titles to two lines, then ellipsis. */
    min-width: 0;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  h4 {
    margin: 0 0 0.5em;
    font-size: var(--font-md, 16px);
    font-weight: 700;
    color: #0c1e27;
  }

  .description {
    margin: 0;
    font-size: var(--font-md, 16px);
    line-height: 1.4;
    color: #0c1e27;
  }

  .edit-selection-link {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--klaxon-color-link, #c41a4d);
    font-size: var(--font-sm, 14px);
    font-weight: 700;
    text-decoration: underline;
  }

  .edit-selection-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
  }

  dl.details {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 0.5rem;
    row-gap: 0.375rem;
    margin: 0;
  }

  dl.details dt {
    font-weight: bold;
  }

  dl.details dt::after {
    content: ":";
  }

  dl.details dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .site .link {
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

  .row-title a,
  .row-title strong {
    color: var(--klaxon-color-link, #c41a4d);
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
