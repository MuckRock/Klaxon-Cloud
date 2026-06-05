<script lang="ts">
  import { onDestroy, untrack } from "svelte";

  import CreateAlert from "../views/CreateAlert.svelte";
  import EditAlert from "../views/EditAlert.svelte";
  import Header from "./Header.svelte";
  import ListAlerts from "../views/ListAlerts.svelte";
  import ListChanges from "../views/ListChanges.svelte";
  import SaveAlert from "../views/SaveAlert.svelte";
  import ToastList from "./ToastList.svelte";

  import { setCanvas, type PickerClient } from "../pickerClient.svelte.ts";
  import { type View, router, setRouter } from "../router.svelte.ts";
  import { toaster, setToaster } from "../toaster.svelte.ts";

  interface Props {
    /** Proxy to the on-page picker, created by the side-panel entry. */
    canvas: PickerClient;
    /** Defaults to closing the side panel window. */
    onclose?: () => void;
  }

  let { canvas, onclose = () => window.close() }: Props = $props();

  router.views = {
    createAlert: CreateAlert,
    editAlert: EditAlert,
    listAlerts: ListAlerts,
    listChanges: ListChanges,
    saveAlert: SaveAlert,
  };

  router.onchange = handleRouteChange;

  setRouter(router);
  setToaster(toaster);
  // canvas is a stable instance for the panel's lifetime; capture it once.
  setCanvas(untrack(() => canvas));

  function handleRouteChange(view: View) {
    canvas.active = ["createAlert", "editAlert"].includes(view);
    canvas.editable = view !== "editAlert";
  }

  // Bind to a reactive variable so the view re-mounts on navigation.
  // Each view loads its own data via an internal $effect (keyed on auth),
  // so there's no boot/reload wiring here.
  const CurrentView = $derived(router.view);

  onDestroy(() => {
    // The picker tears itself down when this page unloads (port disconnect).
    canvas.destroy();
    toaster.destroy();
  });
</script>

<div class="sidebar">
  <Header {onclose} />

  <div class="body">
    <ToastList />

    {#if CurrentView}
      <CurrentView {...router.props} />
    {/if}
  </div>
</div>

<style>
  /* Klaxon design tokens. The sidebar now renders in its own extension
     document (the native side panel), so tokens live on :root and there's
     no host page to leak custom properties in. */
  :global(:root) {
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

  :global(html, body) {
    margin: 0;
    padding: 0;
  }

  .sidebar {
    width: 100%;
    height: 100vh;
    background: #fff;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: var(--font-sm, 14px);
    color: #333;
    display: flex;
    flex-direction: column;
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
