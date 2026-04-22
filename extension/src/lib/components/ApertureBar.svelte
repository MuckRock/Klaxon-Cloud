<script lang="ts">
  import { ZoomIn, ZoomOut } from "@lucide/svelte";

  interface Props {
    /** The element to build the ancestor chain from. null hides the bar. */
    target: Element | null;
    /** Width of the sidebar, used to center the bar in the remaining viewport. */
    sidebarWidth: number;
    /** Host element to exclude from ancestor chain traversal. */
    host: HTMLElement;
    /** Called when the selected ancestor changes — canvas should commit the selection. */
    onselect: (el: Element) => void;
  }

  let { target, sidebarWidth, host, onselect }: Props = $props();

  let ancestors = $state<Element[]>([]);
  let index = $state(0);

  let visible = $derived(ancestors.length > 1);

  // Rebuild ancestor chain whenever target changes
  $effect(() => {
    if (!target) {
      ancestors = [];
      index = 0;
      return;
    }
    const chain: Element[] = [target];
    let current = target.parentElement;
    while (current && current !== document.body && current !== host) {
      chain.push(current);
      current = current.parentElement;
    }
    ancestors = chain;
    index = 0;
  });

  // Reposition on resize
  let left = $state(16);

  function reposition() {
    const barWidth = 444;
    const availableWidth = window.innerWidth - sidebarWidth;
    left = Math.max(16, (availableWidth - barWidth) / 2);
  }

  $effect(() => {
    if (!visible) return;
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  });

  function onRangeInput(e: Event) {
    index = parseInt((e.target as HTMLInputElement).value, 10);
    if (ancestors[index]) onselect(ancestors[index]);
  }

  function zoomOut() {
    if (index < ancestors.length - 1) {
      index++;
      if (ancestors[index]) onselect(ancestors[index]);
    }
  }

  function zoomIn() {
    if (index > 0) {
      index--;
      if (ancestors[index]) onselect(ancestors[index]);
    }
  }

  function stopPropagation(e: Event) {
    e.stopPropagation();
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="aperture-bar"
    style:left="{left}px"
    onmousedown={stopPropagation}
    onclick={stopPropagation}
    onkeydown={stopPropagation}
  >
    <div class="top-row">
      <p class="label">Not quite right? Make your selection wider or narrower:</p>
    </div>
    <div class="bottom-row">
      <button class="icon-btn" onclick={zoomOut} aria-label="Zoom out">
        <ZoomOut size={24} />
      </button>
      <input
        type="range"
        min="0"
        max={ancestors.length - 1}
        value={index}
        step="1"
        dir="rtl"
        oninput={onRangeInput}
      />
      <button class="icon-btn" onclick={zoomIn} aria-label="Zoom in">
        <ZoomIn size={24} />
      </button>
    </div>
  </div>
{/if}

<style>
  .aperture-bar {
    position: fixed;
    bottom: 2em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    width: 444px;
    padding: 0.75em 1.5em 1em;
    background: #292929;
    border: 1px solid #080808;
    border-radius: 0.75em;
    z-index: 2147483647;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    pointer-events: auto;
    box-sizing: border-box;
    box-shadow: 0 2px 4px 0 rgba(35, 35, 35, 0.5);
  }

  .top-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
  }

  .label {
    margin: 0.5em;
  }

  .bottom-row {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 0;
    display: flex;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 4px;
    background: #555;
    border-radius: 2px;
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    border: 2px solid #888;
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    border: 2px solid #888;
  }
</style>
