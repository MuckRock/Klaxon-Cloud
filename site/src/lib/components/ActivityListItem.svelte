<script lang="ts">
  import { getRunLabel, getRunTime, formatTime, getSite, type Run } from "@klaxon/lib";
  import { ExternalLink } from "@lucide/svelte";

  interface Props {
    run: Run;
  }

  const { run }: Props = $props();

  const title = $derived(getRunLabel(run));
  const timestamp = $derived(getRunTime(run));
  const site = $derived(getSite(run.event));
</script>

<div class="row-body">
  <div class="details">
    {#if timestamp}
    <p class="row-meta">
      <a
        title="View snapshot"
        href={run.data?.snapshot ?? site}
        target="_blank"
        rel="noopener noreferrer"
      >
        <time datetime={timestamp.toISOString()}>
          {formatTime(timestamp)}
        </time>
      </a>
    </p>
    {/if}
    <p class="row-title">
      {title}
    </p>
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
  }

  .row-meta {
    margin: 0.125rem 0 0;
    font-size: var(--font-xs);
    color: var(--gray-4);
  }

  .details, .links {
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