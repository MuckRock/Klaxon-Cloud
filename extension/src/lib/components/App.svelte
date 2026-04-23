<script lang="ts">
  import { untrack } from "svelte";
  import { initCanvas, type Canvas } from "../canvas.svelte.ts";
  import { getCanonicalURL } from "../url";
  import Sidebar from "./Sidebar.svelte";

  interface Props {
    host: HTMLElement;
    shadow: ShadowRoot;
    sidebarWidth: number;
    onclose: () => void;
  }

  let { host, shadow, sidebarWidth, onclose }: Props = $props();

  const canvas: Canvas = initCanvas(
    untrack(() => host),
    untrack(() => shadow),
    untrack(() => sidebarWidth),
  );
  const url = getCanonicalURL();

  function handleRouteChange(view: string) {
    canvas.active = view === "createAlert";
  }

  $effect(() => {
    return () => canvas.destroy();
  });
</script>

<Sidebar
  selector={canvas.state.selector}
  matchText={canvas.state.matchText}
  locked={canvas.state.locked}
  {url}
  onclearselection={() => canvas.clearSelection()}
  onselectorchange={(css) => canvas.setSelector(css)}
  onroutechange={handleRouteChange}
  {onclose}
/>

<style>
  :global(.btn-primary) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
    background: #ec7b6b;
    color: #f5f6f7;
    border: 1px solid #69515c;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 1.125em;
    font-weight: 600;
    cursor: pointer;
    line-height: 1.4;
    width: 100%;
  }

  :global(.btn-primary:hover:not(:disabled)) {
    opacity: 0.9;
  }

  :global(.btn-primary:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.button-row) {
    display: flex;
    justify-content: flex-end;
    position: sticky;
    bottom: 0;
    background: #fff;
    margin-top: 1em;
    padding: 1em;
    border-top: 1px solid #ccc;
  }

  :global(.back-link) {
    background: none;
    border: none;
    color: #c41a4d;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    text-align: left;
  }

  :global(.back-link span) {
    text-decoration: underline;
  }

  :global(.back-link:hover) {
    opacity: 0.8;
  }
</style>
