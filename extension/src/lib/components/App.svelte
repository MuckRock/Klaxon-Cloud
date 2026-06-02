<script lang="ts">
  import { onDestroy, untrack } from "svelte";

  import CreateAlert from "../views/CreateAlert.svelte";
  import EditAlert from "../views/EditAlert.svelte";
  import Header from "./Header.svelte";
  import ListAlerts, {
    load as loadListAlerts,
  } from "../views/ListAlerts.svelte";
  import ListChanges, {
    load as loadListChanges,
  } from "../views/ListChanges.svelte";
  import SaveAlert from "../views/SaveAlert.svelte";
  import ToastList from "./ToastList.svelte";

  import { authState } from "../auth.svelte.ts";
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
    createAlert: { component: CreateAlert },
    editAlert: { component: EditAlert },
    listAlerts: { component: ListAlerts, load: loadListAlerts },
    listChanges: { component: ListChanges, load: loadListChanges },
    saveAlert: { component: SaveAlert },
  };

  router.onchange = handleRouteChange;

  // Surface load() failures from navigate()/reload() to the user.
  router.onerror = (error) => {
    console.error("Failed to load view:", error);
    toaster.error("Something went wrong loading this view.");
  };

  setRouter(router);
  setToaster(toaster);

  const canvas: Canvas = initCanvas(
    untrack(() => host),
    untrack(() => shadow),
    untrack(() => sidebarWidth),
  );
  setCanvas(canvas);

  function handleRouteChange(view: View) {
    canvas.active = ["createAlert", "editAlert"].includes(view);
    canvas.editable = view !== "editAlert";
  }

  // Bind to a reactive variable so the view re-mounts on navigation.
  const CurrentView = $derived(router.view);

  // Boot the initial view's data once authenticated, and reload whenever
  // auth flips to authenticated again (e.g. after sign-in). Navigation
  // between views loads on its own via router.navigate() → reload().
  // reload() is untracked: it both reads and writes router.props, so
  // tracking it here would make the effect retrigger on its own writes.
  $effect(() => {
    if (authState.status === "authenticated") {
      untrack(() => router.reload());
    }
  });

  onDestroy(() => {
    canvas.destroy();
    toaster.destroy();
  });
</script>

<div class="sidebar">
  <Header {onclose} />

  <div class="body">
    <ToastList />

    {#if router.loading}
      <div class="loading-bar" role="status" aria-label="Loading"></div>
    {/if}

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

  .loading-bar {
    height: 3px;
    background: linear-gradient(90deg, transparent, #ec7b6b, transparent);
    background-size: 40% 100%;
    background-repeat: no-repeat;
    animation: loading-slide 1s infinite ease-in-out;
  }

  @keyframes loading-slide {
    0% {
      background-position: -40% 0;
    }
    100% {
      background-position: 140% 0;
    }
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
