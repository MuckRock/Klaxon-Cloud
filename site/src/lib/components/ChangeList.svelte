<script lang="ts">
  import type { Run } from "@klaxon/lib/types";
  import ActivityListItem from "$lib/components/ActivityListItem.svelte";

  interface Props {
    changes: Run[];
    // Off on a single alert's page, where every row shares the same address.
    showSite?: boolean;
  }

  const { changes, showSite = true }: Props = $props();
</script>

<ul class="rows">
  {#each changes as run (run.uuid)}
    <li class="row">
      <ActivityListItem {run} {showSite} />
    </li>
  {/each}
</ul>

<style>
  /* A table without the table markup: one set of column tracks for the whole
     list, which each row adopts as a subgrid so timestamps, titles and diff
     links line up. */
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) auto;
    background: var(--white);
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    overflow: hidden;
  }

  .row {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    align-items: center;
    column-gap: 1rem;
    padding: 0.625rem 0.75rem;
  }

  .row + .row {
    border-top: 1px solid var(--gray-2);
  }
</style>
