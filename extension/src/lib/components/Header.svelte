<script lang="ts">
  import { getRouter } from "../router.svelte";
  import X from "@lucide/svelte/icons/x";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Logotype from "./Logotype.svelte";

  interface Props {
    onclose: () => void;
  }

  const { onclose }: Props = $props();

  const router = getRouter();
  const history = $derived(router.history);
</script>

<header class="container">
  <div class="header">
    {#if history.length === 0}
      <div title="Klaxon" class="logo">
        <Logotype />
      </div>
    {:else}
      <button class="back-link" type="button" onclick={() => router.back()}>
        <ArrowLeft size={16} />
        <span class="label">Back</span>
      </button>
    {/if}
    <button onclick={onclose} aria-label="Close">
      <X />
    </button>
  </div>
</header>

<style>
  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 3.25rem;
    gap: 0.5em;
    padding: 0.75em 1em;
    border-top: 2px solid var(--red-3);
    background: var(--klaxon-bg-dark);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header .logo {
    margin: 0;
    flex: 1 1 auto;
    max-width: 9em;
    display: flex;
    align-items: center;
  }

  .header button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0 4px;
    line-height: 1;

    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  button.back-link {
    color: var(--red-3);
    font-feature-settings:
      "liga" off,
      "clig" off;
    font-family: inherit;
    font-size: var(--font-sm, 14px);
    font-style: normal;
    font-weight: 700;

    text-decoration: none;
  }

  .header button:hover {
    color: #000;
  }
</style>
