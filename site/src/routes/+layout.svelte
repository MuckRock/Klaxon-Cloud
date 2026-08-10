<script lang="ts">
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";

  import { page } from "$app/state";
  import { onMount } from "svelte";

  import "../app.css";

  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";

  import { loadUser, clearUser } from "$lib/user.svelte";
  import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from "$lib/telemetry";

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  const TITLE = "Klaxon Cloud";
  const DESCRIPTION =
    "Klaxon notifies you when the pages you care about change.";

  const canonical = $derived(new URL(page.url.pathname, data.origin).href);

  // Keep the cached user (localStorage) in sync with the server's view of the
  // session: hydrate it when authenticated, purge it on logout / expiry.
  $effect(() => {
    if (data.authenticated) loadUser();
    else clearUser();
  });

  onMount(async () => {
    if (!PLAUSIBLE_ENABLED) return;
    const { init } = await import("@plausible-analytics/tracker");
    init({
      domain: PLAUSIBLE_DOMAIN,
      autoCapturePageviews: true,
    });
  });
</script>

<svelte:head>
  <title>Klaxon Cloud</title>
  <meta name="description" content={DESCRIPTION} />
  <link rel="canonical" href={canonical} />

  <!-- Open Graph -->
  <meta property="og:site_name" content="Klaxon Cloud" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonical} />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESCRIPTION} />
  <meta property="og:image" content="{data.origin}/social/facebook.png" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="The Klaxon logo" />
  <meta property="og:locale" content="en_US" />

  <!-- X/Twitter -->
  <meta name="twitter:site" content="@muckrock" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESCRIPTION} />
  <meta name="twitter:image" content="{data.origin}/social/twitter.png" />
  <meta name="twitter:image:alt" content="The Klaxon logo" />
</svelte:head>

<div class="app">
  <SiteHeader
    authenticated={data.authenticated ?? false}
    accountsHost={data.accountsHost}
  />
  <main>
    {@render children()}
  </main>
  <SiteFooter />
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
