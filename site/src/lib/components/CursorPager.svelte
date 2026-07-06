<script lang="ts">
  import type { Nullable } from "@klaxon/lib/types";

  interface Props {
    next?: Nullable<string>;
    prev?: Nullable<string>;
  }

  const { prev, next }: Props = $props();

  // The API hands back full cursor URLs for the adjacent pages; turn each into
  // a link to this route so navigating just re-runs `load` with the cursor.
  function pageHref(url: string | null | undefined): string | null {
    if (!url) return null;
    const cursor = new URL(url).searchParams.get("cursor");
    return cursor ? `?cursor=${encodeURIComponent(cursor)}` : null;
  }

  let prevHref = $derived(pageHref(prev));
  let nextHref = $derived(pageHref(next));
</script>

{#if prevHref || nextHref}
  <nav class="pager" aria-label="Change history pages">
    {#if prevHref}
      <a class="page-link" href={prevHref} rel="prev">← Previous</a>
    {:else}
      <span class="page-link disabled" aria-disabled="true">← Previous</span>
    {/if}
    {#if nextHref}
      <a class="page-link" href={nextHref} rel="next">Next →</a>
    {:else}
      <span class="page-link disabled" aria-disabled="true">Next →</span>
    {/if}
  </nav>
{/if}

<style>
  .pager {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .page-link {
    padding: 0.5rem 1.25rem;
    background: var(--white);
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    font-size: var(--font-sm);
    font-weight: 600;
    text-decoration: none;
    color: inherit;
  }

  .page-link:hover:not(.disabled) {
    background: var(--gray-1);
  }

  .page-link.disabled {
    color: var(--gray-4);
    cursor: default;
    pointer-events: none;
    visibility: hidden;
  }
</style>