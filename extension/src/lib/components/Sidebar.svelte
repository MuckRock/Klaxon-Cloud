<script lang="ts">
  import Debug from "../views/Debug.svelte";
  import CreateAlert from "../views/CreateAlert.svelte";
  import SaveAlert from "../views/SaveAlert.svelte";
  import Router from "./Router.svelte";
  import { X } from "@lucide/svelte";

  interface Props {
    selector: string;
    matchText: string;
    url: string;
    locked: boolean;
    onclearselection: () => void;
    onselectorchange: (css: string) => Element | null;
    onclose: () => void;
  }

  let { selector, matchText, url, locked, onclearselection, onselectorchange, onclose }: Props =
    $props();
</script>

<Router initialView="home">
  {#snippet children(router)}
  <div class="sidebar">
    <div class="header">
      <h2>Klaxon</h2>
      <button onclick={onclose} aria-label="Close">
        <X />
      </button>
    </div>

    <div class="body">
      {#if router.view === "home"}
        <Debug {selector} {matchText} {url} />
      {:else if router.view === "createAlert"}
        <CreateAlert {locked} {selector} {matchText} {onselectorchange} {onclearselection} />
      {:else if router.view === "saveAlert"}
        <SaveAlert {selector} {matchText} {url} />
      {/if}
    </div>
  </div>
  {/snippet}
</Router>

<style>
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
    font-size: 14px;
    color: #333;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    background: #f8f8f8;
  }

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .header button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0 4px;
    line-height: 1;
  }

  .header button:hover {
    color: #000;
  }

  .body {
    overflow-y: auto;
    flex: 1;
  }
</style>
