<script lang="ts">
  import type { Page, Event, Run } from "../types";

  import { onDestroy, untrack } from "svelte";

  import CreateAlert from "../views/CreateAlert.svelte";
  import EditAlert from "../views/EditAlert.svelte";
  import Header from "./Header.svelte";
  import ListAlerts from "../views/ListAlerts.svelte";
  import ListChanges from "../views/ListChanges.svelte";
  import SaveAlert from "../views/SaveAlert.svelte";
  import Toaster from "./Toaster.svelte";
  import ToastList from "./ToastList.svelte";

  import { router, setRouter } from "../router.svelte.ts";
  import { initCanvas, type Canvas } from "../canvas.svelte.ts";
  import { getCanonicalURL } from "../url";
  import { authState } from "../auth.svelte.ts";
  import { scheduled, history } from "../api";

  interface Props {
    host: HTMLElement;
    shadow: ShadowRoot;
    sidebarWidth: number;
    onclose: () => void;
  }

  router.views = {
    createAlert: CreateAlert,
    editAlert: EditAlert,
    listAlerts: ListAlerts,
    listChanges: ListChanges,
    saveAlert: SaveAlert,
  };

  router.onchange = handleRouteChange;

  setRouter(router);

  let { host, shadow, sidebarWidth, onclose }: Props = $props();

  const canvas: Canvas = initCanvas(
    untrack(() => host),
    untrack(() => shadow),
    untrack(() => sidebarWidth),
  );
  const url = getCanonicalURL();

  function emptyPage<T>(): Page<T> {
    return {
      next: null,
      previous: null,
      results: [],
    };
  }

  let events: Page<Event> = $state(emptyPage());
  let runs: Page<Run> = $state(emptyPage());

  async function loadData() {
    const [eventsRes, runsRes] = await Promise.all([
      scheduled(url),
      history(url),
    ]);
    if (eventsRes.data) events = eventsRes.data;
    if (runsRes.data) runs = runsRes.data;
  }

  $effect(() => {
    if (authState.status === "authenticated") {
      loadData();
    }
  });

  function handleRouteChange(view: string) {
    canvas.active = ["createAlert", "editAlert"].includes(view);
    canvas.editable = view !== "editAlert";
    loadData();
  }

  onDestroy(() => canvas.destroy());
</script>

<Toaster>
  <div class="sidebar">
    <Header {onclose} />

    <div class="body">
      <ToastList />
      {#if router.current === "listChanges"}
        <ListChanges {events} {runs} {...router.props} />
      {:else if router.current === "listAlerts"}
        <ListAlerts {events} />
      {:else if router.current === "createAlert"}
        <CreateAlert
          locked={canvas.state.locked}
          selector={canvas.state.selector}
          matchText={canvas.state.matchText}
          onselectorchange={(css) => canvas.setSelector(css)}
          onclearselection={() => canvas.clearSelection()}
          {...router.props}
        />
      {:else if router.current === "saveAlert"}
        <SaveAlert
          selector={canvas.state.selector}
          matchText={canvas.state.matchText}
          {url}
          onsave={() => canvas.clearSelection()}
          {...router.props}
        />
      {:else if router.current === "editAlert"}
        <EditAlert
          onselectorchange={(css) => canvas.setSelector(css)}
          onclearselection={() => canvas.clearSelection()}
          onsave={() => canvas.clearSelection()}
          {...router.props}
        />
      {/if}
    </div>
  </div>
</Toaster>

<style>
  :host {
    /* Klaxon design tokens. Defined on the shadow host so the whole
       sidebar inherits them and host-page custom properties of the same
       name can't leak in through the shadow boundary. */
    --font-sans: "Source Sans Pro", sans-serif;
    --font-sm: 14px;
    --font-md: 16px;
    --font-lg: 20px;

    --klaxon-color-link: #c41a4d;
    --gray-1: #f5f6f7;
    --gray-2: #d8dee2;
    --orange-2: #ffc2ba;
    --orange-3: #ec7b6b;
    --orange-4: #69515c;

    --klaxon-border-radius: 0.5rem;
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    background: #fff;
    border-left: 2px solid #ccc;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: var(--font-sm, 14px);
    color: #333;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .body {
    overflow-y: auto;
    flex: 1;
  }

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
    color: var(--klaxon-color-link, #c41a4d);
    font-size: var(--font-sm, 14px);
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
