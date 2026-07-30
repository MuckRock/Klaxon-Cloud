<script lang="ts">
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";

  import "../app.css";

  import SiteHeader from "$lib/components/SiteHeader.svelte";

  import { loadUser, clearUser } from "$lib/user.svelte";

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  // Keep the cached user (localStorage) in sync with the server's view of the
  // session: hydrate it when authenticated, purge it on logout / expiry.
  $effect(() => {
    if (data.authenticated) loadUser();
    else clearUser();
  });
</script>

<svelte:head>
  <title>Klaxon Cloud</title>
</svelte:head>

<div class="app">
  <SiteHeader
    authenticated={data.authenticated ?? false}
    accountsHost={data.accountsHost}
  />
  <main>
    {@render children()}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    max-width: 64rem;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
</style>
