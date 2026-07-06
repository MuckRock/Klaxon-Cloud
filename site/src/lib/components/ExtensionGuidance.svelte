<script lang="ts">
  import Loading from "@klaxon/lib/components/Loading.svelte";
  import {
    detectExtension,
    detectBrowser,
    STORE_URLS,
    type Browser,
  } from "$lib/extension-bridge";

  // Detects whether the Klaxon extension is installed and shows the matching
  // guidance: how to use it when present, how to install it when not. Alerts
  // can only be created from the extension, so this is the entry point.

  // "detecting" until the ping round-trip settles, then installed / not.
  let status = $state<"detecting" | "installed" | "missing">("detecting");
  let browser = $state<Browser>("other");

  // The store link + label for the current browser (Safari/other has no build).
  const store = $derived.by(() => {
    switch (browser) {
      case "firefox":
        return { label: "Add to Firefox", url: STORE_URLS.firefox };
      case "chrome":
        return { label: "Add to Chrome", url: STORE_URLS.chrome };
      case "safari":
      case "other":
      default:
        return null;
    }
  });
  

  $effect(() => {
    browser = detectBrowser();
    detectExtension().then((found) => {
      status = found ? "installed" : "missing";
    });
  });
</script>

<section class="guidance">
  
  {#if status === "detecting"}
  <Loading message="Looking for the Klaxon extension…" />
  {:else if status === "installed"}
    <h2>The Klaxon Cloud extension is installed!</h2>
    <p class="lede">Alerts are created right from the page you want to watch. Visit a webpage, trigger the <strong>Klaxon Cloud</strong> extension and create a new alert.</p>
    <p class="hint">
      Don't see the Klaxon icon? Open your browser's extensions menu and pin
      Klaxon to the toolbar.
    </p>
  {:else if store}
    <h2>Create new alerts with the Klaxon browser extension.</h2>
    <p class="lede">Follow these steps to install:</p>
    <ol class="steps">
      <li>Install the extension from <a href={store.url} target="_blank" rel="noopener">your browser&rsquo;s store</a>.</li>
      <li>Pin the <strong>Klaxon Cloud</strong> icon to your browser toolbar.</li>
      <li>
        Open a page you want to watch, click the icon, and choose
        <strong>Create a new alert</strong>.
      </li>
    </ol>
    <a class="btn-primary" href={store.url} target="_blank" rel="noopener">
      {store.label}
    </a>
  {:else}
    <p class="lede">
      Create alerts with the Klaxon browser extension, which is available for
      Chrome and Firefox. Safari isn't supported at this time.
    </p>
    <div class="store-links">
      <a class="nav-link" href={STORE_URLS.chrome} target="_blank" rel="noopener">
        Get it for Chrome
      </a>
      <a class="nav-link" href={STORE_URLS.firefox} target="_blank" rel="noopener">
        Get it for Firefox
      </a>
    </div>
  {/if}
</section>

<style>
  .guidance {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    border: 1px solid var(--gray-2);
    border-radius: 8px;
    background: var(--white);
    padding: 1em;
  }

  h2 {
    margin: 0;
    font-size: var(--font-lg);
    font-weight: 700;
    color: var(--red-4);
    max-width: 36rem;
  }

  .lede {
    margin: 0;
    color: var(--gray-5);
    font-size: var(--font-lg);
    max-width: 36rem;
  }

  .steps {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    line-height: 1.4;
    max-width: 36rem;
  }

  .hint {
    margin: 0;
    color: var(--gray-4);
    font-size: var(--font-sm);
  }

  .store-links {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .nav-link {
    font-size: var(--font-lg);
    color: var(--klaxon-color-link);
    text-decoration: none;
    font-weight: 600;
  }

  .nav-link:hover {
    text-decoration: underline;
  }

  .btn-primary {
    max-width: max-content;
  }
</style>
