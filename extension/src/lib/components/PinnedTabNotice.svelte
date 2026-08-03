<script lang="ts">
  // While a selection flow is open, the canvas is pinned to the tab it began on.
  // If the user switches to a different tab, the on-page overlay isn't visible
  // and picking is paused — so surface where the selection lives and offer a way
  // back. Rendered (no-op unless `canvas.away`) by the picker/edit views.
  import { ArrowRight } from "@lucide/svelte";

  import { getCanvas } from "../canvas-client.svelte";

  const canvas = getCanvas();
</script>

{#if canvas.away}
  <button
    type="button"
    class="pinned-notice"
    onclick={() => canvas.focusPinnedTab()}
  >
    <span class="pinned-text">
      Your selection is on another tab{#if canvas.pinnedTitle}:
        <strong class="pinned-title">{canvas.pinnedTitle}</strong>{/if}
    </span>
    <span class="pinned-jump">
      Go to tab
      <ArrowRight size={14} />
    </span>
  </button>
{/if}

<style>
  .pinned-notice {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    width: 100%;
    text-align: left;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--orange-2, #ffc2ba);
    border-radius: var(--klaxon-border-radius, 0.5rem);
    background: var(--orange-1, #fff0ee);
    cursor: pointer;
    font-family: inherit;
  }

  .pinned-notice:hover {
    border-color: var(--orange-3, #ec7b6b);
  }

  .pinned-text {
    /* Flex items size to min-content by default, which a long title would blow
       past — stretch to the notice width and let the title wrap inside it. */
    align-self: stretch;
    min-width: 0;
    font-size: var(--font-sm, 14px);
    line-height: 1.4;
    color: #0c1e27;
  }

  .pinned-title {
    /* Clamp long page titles to two lines, then ellipsis. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .pinned-jump {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--font-sm, 14px);
    font-weight: 700;
    color: var(--klaxon-color-link, #c41a4d);
  }
</style>
