<script lang="ts">
  import {
    formatTime,
    getDomain,
    getRelativeTime,
    getRunLabel,
    getRunTime,
    getSite,
    isEvent,
    type Run,
  } from "@klaxon/lib";
  import { Camera, Diff } from "@lucide/svelte";

  interface Props {
    run: Run;
    // Off on a single alert's page, where every row shares the same address.
    showSite?: boolean;
    // Off on a single alert's page too, where the link would point at the page
    // the row is already on.
    linkAlert?: boolean;
  }

  const { run, showSite = true, linkAlert = true }: Props = $props();

  const timestamp = $derived(getRunTime(run));

  // The alert that scheduled this run. Runs are fetched with `expand=event`, so
  // it's normally the full object — fall back gracefully when it isn't.
  const alert = $derived(isEvent(run.event) ? run.event : null);

  // Enough to link back to the alert even when `event` came through unexpanded,
  // since then it's the id itself. It's optional on a run, so it can be absent.
  const alertId = $derived(
    isEvent(run.event) ? run.event.id : (run.event ?? null),
  );
  const label = $derived(getRunLabel(run));
  const domain = $derived(getDomain(run.event));
  const site = $derived(getSite(run.event));

  // Name the alert's site under the label: on its own the label is ambiguous —
  // it's a title or a bare path, so two alerts can read identically. Domain and
  // path join back into the full URL; when the label is already the path, or the
  // path is nothing to speak of, the domain alone finishes the address.
  const subtitle = $derived.by(() => {
    if (!domain || !site || site === "/" || label === site) return domain;
    // An unparseable site falls back to the raw string in both halves.
    if (!site.startsWith("/")) return domain;
    return `${domain}${site}`;
  });
</script>

<div class="row-body">
  {#if timestamp}
    <!-- Two lines, so this column fills the same height as the label and
         address beside it: when the change landed, then exactly when. One
         `datetime` covers both renderings, and the snapshot link that used to
         sit here now lives with the other actions. -->
    <p class="row-meta">
      <time datetime={timestamp.toISOString()}>
        <span class="ago">{getRelativeTime(timestamp)}</span>
        <span class="exact">{formatTime(timestamp)}</span>
      </time>
    </p>
  {/if}
  <div class="alert">
    <!-- The label leads to the alert that scheduled this run, matching
         AlertListItem; the timestamp and diff links go out to the watched page
         and the snapshot instead. -->
    {#if linkAlert && alertId !== null}
      <a
        class="row-title"
        href="/alerts/{alertId}/"
        title={alert?.parameters.site}
      >
        {label}
      </a>
    {:else}
      <p class="row-title" title={alert?.parameters.site}>
        {label}
      </p>
    {/if}
    {#if showSite && subtitle}
      <p class="row-site">{subtitle}</p>
    {/if}
  </div>
  <div class="links">
    <a
      title="View snapshot"
      href={run.data?.snapshot ?? alert?.parameters.site}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Camera size={16} />
      View snapshot
    </a>
    {#if run.data?.compare}
      <a
        class="compare"
        href={run.data.compare}
        target="_blank"
        rel="noopener noreferrer"
        title="Show differences"
      >
        <Diff size={16} />
        View changes
      </a>
    {/if}
  </div>
</div>

<style>
  /* Adopt the list's columns (see `.rows` in ChangeList) so the timestamp,
     alert and diff link line up down the whole list instead of each row sizing
     its own columns. */
  .row-body {
    min-width: 0;
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    align-items: baseline;
  }

  .row-title {
    margin: 0;
    font-size: var(--font-md);
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .row-meta {
    grid-column: 1;
    /* No top nudge: `.ago` is the label's size, so the two columns' first lines
       share the row's baseline on their own. */
    margin: 0;
    white-space: nowrap;
    text-align: right;
  }

  .row-meta time {
    display: block;
  }

  /* Lead with how long ago the change landed — the half worth scanning — at the
     label's size. The exact stamp sits under it, sized like the address. */
  .ago {
    display: block;
    font-size: var(--font-md);
    color: var(--black);
    line-height: 1.6;
  }

  .exact {
    display: block;
    font-size: var(--font-xs);
    color: var(--gray-4);
  }

  .row-site {
    margin: 0;
    font-size: var(--font-xs);
    font-weight: 400;
    color: var(--gray-4);
    overflow-wrap: anywhere;
  }

  /* The alert block is the flexible column of the row: let it shrink so long
     paths wrap instead of pushing the actions off the edge. */
  .alert {
    grid-column: 2;
    min-width: 0;
  }

  .links {
    grid-column: 3;
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    padding: 0 1rem;
    align-items: center;
    align-self: center;
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .links a {
    display: inline-flex;
    flex-direction: row;
    gap: 0.25rem;
    align-items: center;
    align-self: center;
    text-decoration: none;
    &:hover {
      color: var(--black);
    }
  }

  /* Three columns don't fit a phone: drop the shared tracks and stack the
     timestamp, the alert and the diff link so none of them has to wrap
     mid-word. */
  @media (max-width: 32rem) {
    .row-body {
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
      row-gap: 0.125rem;
    }

    .row-meta,
    .alert,
    .links {
      grid-column: 1;
    }

    .row-meta {
      margin: 0;
      order: -1;
    }
  }
</style>
