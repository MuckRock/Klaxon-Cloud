<script lang="ts">
  import type { Run } from "@klaxon/lib/types";
  import type { PageProps } from "./$types";

  import { isEvent } from "@klaxon/lib/utils";

  let { data }: PageProps = $props();

  let changes = $derived(data.changes?.results ?? []);

  // The URL of the page this run was watching, if the event is expanded.
  function getSite(run: Run): string | undefined {
    return isEvent(run.event) ? run.event.parameters.site : undefined;
  }

  // The user-given alert title, if they set one.
  function getTitle(run: Run): string | undefined {
    return isEvent(run.event) ? run.event.parameters.title : undefined;
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
</script>

<svelte:head>
  <title>Activity | Klaxon Cloud</title>
</svelte:head>

<div class="activity">
  <h1>Recent changes</h1>

  {#if changes.length === 0}
    <p class="empty">No changes detected yet.</p>
  {:else}
    <ul class="rows">
      {#each changes as run (run.uuid)}
        {@const site = getSite(run)}
        {@const title = getTitle(run)}
        <li class="row">
          <div class="row-body">
            {#if title}
              <p class="row-title">{title}</p>
            {/if}
            <p class="row-url">
              {#if site}
                <!-- Link to the archived snapshot of this change when we have
                     one, so the link matches the version that actually changed;
                     fall back to the live page otherwise. -->
                <a
                  href={run.data?.snapshot ?? site}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site}
                </a>
              {:else}
                {run.addon.name}
              {/if}
            </p>
            <p class="row-meta">{formatDate(run.created_at)}</p>
          </div>
          <div class="links">
            {#if run.data?.compare}
              <a
                href={run.data.compare}
                target="_blank"
                rel="noopener noreferrer"
              >
                View change
              </a>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .activity {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h1 {
    margin: 0;
    font-size: var(--font-xl);
    font-weight: 700;
  }

  .empty {
    color: var(--gray-4);
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--white);
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    overflow: hidden;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 0.75rem;
  }

  .row + .row {
    border-top: 1px solid var(--gray-2);
  }

  .row-body {
    min-width: 0;
  }

  .row-title {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .row-url {
    margin: 0.125rem 0 0;
    overflow-wrap: anywhere;
    font-size: var(--font-sm);
  }

  .row-meta {
    margin: 0.125rem 0 0;
    font-size: var(--font-xs);
    color: var(--gray-4);
  }

  .links {
    flex: none;
    display: flex;
    gap: 1rem;
    font-size: var(--font-sm);
    font-weight: 600;
  }
</style>
