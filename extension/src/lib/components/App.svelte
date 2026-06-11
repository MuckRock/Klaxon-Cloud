<script lang="ts">
  import { onDestroy, untrack } from "svelte";

  import CreateAlert from "../views/CreateAlert.svelte";
  import EditAlert from "../views/EditAlert.svelte";
  import EditSelection from "../views/EditSelection.svelte";
  import Header from "./Header.svelte";
  import ListAlerts from "../views/ListAlerts.svelte";
  import SaveAlert from "../views/SaveAlert.svelte";
  import SignIn from "../views/SignIn.svelte";
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
    saveAlert: SaveAlert,
    signIn: SignIn,
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

  // Views that display a selection. Leaving this set (e.g. clicking "Back" out
  // to a list) clears the selection so it doesn't linger on the page. The pick
  // views (createAlert/saveAlert) build a fresh selection that must survive the
  // hop between them, so they can't just clear it on their own teardown.
  const SELECTION_VIEWS: Set<View> = new Set([
    "createAlert",
    "saveAlert",
    "editAlert",
    "editSelection",
    "viewAlert",
  ]);

  function handleRouteChange(view: View) {
    canvas.active = [
      "createAlert",
      "editAlert",
      "editSelection",
      "viewAlert",
    ].includes(view);
    canvas.editable = !["editAlert", "viewAlert"].includes(view);
    if (!SELECTION_VIEWS.has(view)) canvas.clearSelection();
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
    --gray-3: #99a8b3;
    --gray-4: #5c717c;
    --blue-1: #eaa4bb;
    --blue-2: #b5ceed;
    --blue-3: #4294f0;
    --blue-4: #1367d0;
    --orange-1: #fff0ee;
    --orange-2: #ffc2ba;
    --orange-3: #ec7b6b;
    --orange-4: #69515c;
    --red-1: #eaa4bb;
    --red-2: #eaa4bb;
    --red-3: #e1275f;
    --red-4: #5d275f;

    --klaxon-bg: #fffdf3;
    --klaxon-bg-dark: #fff5e3;

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
    background: var(--red-3);
    color: #fff;
    border: 1px solid var(--red-4);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 1.375em;
    font-weight: 700;
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
    /* Fade overflow out beneath the row: transparent at the top edge,
       reaching the full background before the button so content scrolling
       underneath appears to dissolve rather than meet a hard line. */
    background: linear-gradient(to bottom, transparent, var(--klaxon-bg) 20%);
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
