<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { Page, Run } from "@klaxon/lib/types";
  import ChangeList from "$lib/components/ChangeList.svelte";
  import CursorPaginator from "$lib/components/CursorPager.svelte";
  import Loading from "@klaxon/lib/components/Loading.svelte";

  interface Props {
    data: {
      changes: Promise<Page<Run>>;
      showAll: boolean;
    };
  }

  let { data }: Props = $props();

  // Drive the filter through the URL so it plays nicely with the cursor-based
  // pager and SSR. Toggling drops the cursor to land back on the first page.
  function toggleShowAll(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const url = new URL(page.url);
    if (checked) {
      url.searchParams.set("all", "true");
    } else {
      url.searchParams.delete("all");
    }
    url.searchParams.delete("cursor");
    goto(`${url.pathname}${url.search}`, { keepFocus: true });
  }
</script>

<svelte:head>
  <title>Activity | Klaxon Cloud</title>
</svelte:head>

<div class="activity">
  <div class="header">
    <h1>Recent changes</h1>

    <label class="toggle">
      <input type="checkbox" checked={data.showAll} onchange={toggleShowAll} />
      Show runs without changes
    </label>
  </div>

  {#await data.changes}
    <Loading message="Loading changes…" />
  {:then page}
    {@const changes = page?.results ?? []}
    {#if changes.length === 0}
      <p class="empty">No changes detected yet.</p>
    {:else}
      <ChangeList {changes} />

      <CursorPaginator prev={page?.previous} next={page?.next} />
    {/if}
  {:catch}
    <p class="empty">Couldn’t load changes. Try again.</p>
  {/await}
</div>

<style>
  .activity {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  h1 {
    margin: 0;
    font-size: var(--font-xl);
    font-weight: 700;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--gray-4);
    cursor: pointer;
  }

  .toggle input {
    cursor: pointer;
  }

  .empty {
    color: var(--gray-4);
  }
</style>
