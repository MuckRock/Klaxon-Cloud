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

  import { type CanvasClient, setCanvas } from "../canvas-client.svelte.ts";
  import { type View, router, setRouter } from "../router.svelte.ts";
  import { toaster, setToaster } from "../toaster.svelte.ts";

  interface Props {
    // The panel-side proxy for the on-page Canvas, created in src/sidepanel.ts.
    canvas: CanvasClient;
  }

  let { canvas }: Props = $props();

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
  // `canvas` is a stable instance for the panel's lifetime; untrack the read so
  // it isn't flagged as only capturing the initial value.
  setCanvas(untrack(() => canvas));

  // Views that display a selection. These are the "selection flow": while in
  // one, the canvas is pinned to the tab the flow started on (so switching tabs
  // doesn't disrupt an in-progress pick), and leaving the set clears the
  // selection so it doesn't linger on the page. The panel itself is global —
  // its view/form state is *not* tied to the active tab.
  const SELECTION_VIEWS: Set<View> = new Set([
    "createAlert",
    "saveAlert",
    "editAlert",
    "editSelection",
    "viewAlert",
  ]);

  function handleRouteChange(view: View) {
    const selecting = SELECTION_VIEWS.has(view);
    canvas.active = [
      "createAlert",
      "editAlert",
      "editSelection",
      "viewAlert",
    ].includes(view);
    canvas.editable = !["editAlert", "viewAlert"].includes(view);
    // Clear before unpinning, so the "clear" reaches the pinned tab rather than
    // whatever tab tracking reconnects to.
    if (!selecting) canvas.clearSelection();
    canvas.pinned = selecting;
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
  <Header />

  <div class="body">
    <ToastList />

    {#if CurrentView}
      <CurrentView {...router.props} />
    {/if}
  </div>
</div>

<style>
  :root {
    /* Klaxon design tokens. The panel is its own extension-origin document, so
       these live on :root (there's no shadow host to scope them to, and no
       host-page styles to leak in). */
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
    /* The native panel sizes the window; fill it. (Width is browser-controlled
       and user-resizable — we no longer pin 300px.) */
    width: 100%;
    height: 100%;
    /* Establish a stacking context so descendants using a negative z-index
       (the Siren's beams in Welcome) sit above this background instead of
       dropping behind it. The old page-injected sidebar got this for free from
       its position:fixed + z-index; the panel needs it explicitly. */
    isolation: isolate;
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
    display: flex;
    flex-direction: column;
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
