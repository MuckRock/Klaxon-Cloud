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
  }

  const { run }: Props = $props();

  const timestamp = $derived(getRunTime(run));

  // The alert that scheduled this run. Runs are fetched with `expand=event`, so
  // it's normally the full object — fall back gracefully when it isn't.
  const alert = $derived(isEvent(run.event) ? run.event : null);
  const label = $derived(getRunLabel(run));
  const domain = $derived(getDomain(run.event));
  const site = $derived(getSite(run.event));

  // Name the alert's site under the label: on its own the label is ambiguous —
  // it's a title or a bare path, so two alerts can read identically. When the
  // label is already the path, the domain alone finishes the address.
  const subtitle = $derived(
    domain && site && label !== site ? `${domain} · ${site}` : domain,
  );
</script>

<div class="row-body">
  <div class="details">
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
      {#if subtitle}
        <p class="row-site">{subtitle}</p>
      {/if}
    </div>
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
  .row-body {
    min-width: 0;
    width: 100%;
    display: flex;
    gap: 1rem;
    align-items: baseline;
    justify-content: space-between;
  }

  .row-title {
    margin: 0;
    font-size: var(--font-sm);
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .row-meta {
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

  .details,
  .links {
    display: flex;
    flex-direction: column;
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .details {
    flex: 1 1 auto;
    flex-direction: row;
    align-items: baseline;
    gap: 1em;
  }

  /* The alert block is the flexible part of the row: let it shrink so long
     paths wrap instead of pushing the actions off the edge. */
  .alert {
    min-width: 0;
  }

  .links {
    flex: 0 1 12em;
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
</style>
