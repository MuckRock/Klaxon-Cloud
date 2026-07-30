<script lang="ts">
  import {
    formatTime,
    getDomain,
    getRunLabel,
    getRunTime,
    getSite,
    isEvent,
    type Run,
  } from "@klaxon/lib";
  import { ExternalLink } from "@lucide/svelte";

  interface Props {
    run: Run;
    // Off on a single alert's page, where every row shares the same address.
    showSite?: boolean;
  }

  const { run, showSite = true }: Props = $props();

  const timestamp = $derived(getRunTime(run));

  // The alert that scheduled this run. Runs are fetched with `expand=event`, so
  // it's normally the full object — fall back gracefully when it isn't.
  const alert = $derived(isEvent(run.event) ? run.event : null);
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
    <p class="row-meta">
      <a
        title="View snapshot"
        href={run.data?.snapshot ?? alert?.parameters.site}
        target="_blank"
        rel="noopener noreferrer"
      >
        <time datetime={timestamp.toISOString()}>
          {formatTime(timestamp)}
        </time>
      </a>
    </p>
  {/if}
  <div class="alert">
    <p class="row-title" title={alert?.parameters.site}>
      {label}
    </p>
    {#if showSite && subtitle}
      <p class="row-site">{subtitle}</p>
    {/if}
  </div>
  <div class="links">
    {#if run.data?.compare}
      <a
        class="compare"
        href={run.data.compare}
        target="_blank"
        rel="noopener noreferrer"
        title="Show differences"
      >
        Show differences
        <ExternalLink size={16} />
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
    font-size: var(--font-sm);
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .row-meta {
    grid-column: 1;
    margin: 0.125rem 0 0;
    font-size: var(--font-xs);
    color: var(--gray-4);
    white-space: nowrap;
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
    flex-direction: column;
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .compare {
    display: inline-flex;
    gap: 0.25em;
    align-items: center;
    text-decoration: underline;
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
