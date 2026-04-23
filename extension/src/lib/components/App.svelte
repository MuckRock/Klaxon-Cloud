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
