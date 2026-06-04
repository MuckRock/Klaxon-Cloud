<script lang="ts">
  import { onDestroy, untrack } from "svelte";

  import CreateAlert from "../views/CreateAlert.svelte";
  import EditAlert from "../views/EditAlert.svelte";
  import EditSelection from "../views/EditSelection.svelte";
  import Header from "./Header.svelte";
  import ListAlerts from "../views/ListAlerts.svelte";
  import ListChanges from "../views/ListChanges.svelte";
  import SaveAlert from "../views/SaveAlert.svelte";
  import ToastList from "./ToastList.svelte";
  import ViewAlert from "../views/ViewAlert.svelte";

  import { initCanvas, setCanvas, type Canvas } from "../canvas.svelte.ts";
  import { type View, router, setRouter } from "../router.svelte.ts";
  import { toaster, setToaster } from "../toaster.svelte.ts";

  interface Props {
    host: HTMLElement;
    shadow: ShadowRoot;
    sidebarWidth: number;
    onclose: () => void;
  }

  let { host, shadow, sidebarWidth, onclose }: Props = $props();

  router.views = {
    createAlert: CreateAlert,
    editAlert: EditAlert,
    listAlerts: ListAlerts,
    listChanges: ListChanges,
    saveAlert: SaveAlert,
    viewAlert: ViewAlert,
    editSelection: EditSelection,
  };

  router.onchange = handleRouteChange;

  setRouter(router);
  setToaster(toaster);

  const canvas: Canvas = initCanvas(
    untrack(() => host),
    untrack(() => shadow),
    untrack(() => sidebarWidth),
  );
  setCanvas(canvas);

  function handleRouteChange(view: View) {
    canvas.active = [
      "createAlert",
      "editAlert",
      "editSelection",
      "viewAlert",
    ].includes(view);
    canvas.editable = !["editAlert", "viewAlert"].includes(view);
  }

  // Bind to a reactive variable so the view re-mounts on navigation.
  // Each view loads its own data via an internal $effect (keyed on auth),
  // so there's no boot/reload wiring here.
  const CurrentView = $derived(router.view);

  onDestroy(() => {
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
  :host {
    /* Klaxon design tokens. Defined on the shadow host so the whole
       sidebar inherits them and host-page custom properties of the same
       name can't leak in through the shadow boundary. */
    --font-sans: "Source Sans Pro", sans-serif;
    --font-xs: 12px;
    --font-sm: 14px;
    --font-md: 16px;
    --font-lg: 20px;
    --font-xl: 24px;

    --klaxon-color-link: #c41a4d;
    --white: #ffffff;
    --gray-1: #f5f6f7;
    --gray-2: #d8dee2;
    --gray-3: #99A8B3;
    --blue-3: #4294F0;
    --blue-4: #1367D0;
    --orange-2: #ffc2ba;
    --orange-3: #ec7b6b;
    --orange-4: #69515c;
    --red-3: #e1275f;

    --klaxon-bg: #FFFDF3;
    --klaxon-bg-dark: #FFF5E3;

    --klaxon-border-radius: 0.5rem;
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    background: var(--klaxon-bg);
    font-family: var(
      --font-sans,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif
    );
    font-size: var(--font-sm, 14px);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    color: #333;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .body {
    overflow-y: auto;
    flex: 1;
    border-left: 1px solid var(--klaxon-bg-dark);
  }

  :global(.btn-primary) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
    font-family: var(--font-sans);
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
    background: var(--klaxon-bg);
    margin-top: 1em;
    padding: 1em;
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
