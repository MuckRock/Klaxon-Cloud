<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Loader from "@lucide/svelte/icons/loader";
  import Puzzle from "@lucide/svelte/icons/puzzle";
  import {
    detectExtension,
    detectBrowser,
    STORE_URLS,
    type Browser,
  } from "$lib/extension-bridge";

  // Detects whether the Klaxon extension is installed and reports it as a
  // one-line status row: found, or a single install instruction for this
  // browser. The full explanation lives behind "More information", since alerts
  // can only be created from the extension and that's worth spelling out once.

  // "detecting" until the ping round-trip settles, then installed / not.
  let status = $state<"detecting" | "installed" | "missing">("detecting");
  let browser = $state<Browser>("other");
  let expanded = $state(false);

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
  <div class="row" class:ok={status === "installed"}>
    <span class="icon" aria-hidden="true">
      {#if status === "detecting"}
        <span class="spinner"><Loader size={18} /></span>
      {:else if status === "installed"}
        <CircleCheck size={18} />
      {:else}
        <Puzzle size={18} />
      {/if}
    </span>

    <p class="status">
      {#if status === "detecting"}
        Looking for the Klaxon extension…
      {:else if status === "installed"}
        The Klaxon extension is installed and ready.
      {:else if store}
        Alerts are created with the Klaxon extension &mdash;
        <a href={store.url} target="_blank" rel="noopener">{store.label}</a>.
      {:else}
        Alerts are created with the Klaxon extension, available for
        <a href={STORE_URLS.chrome} target="_blank" rel="noopener">Chrome</a>
        and
        <a href={STORE_URLS.firefox} target="_blank" rel="noopener">Firefox</a>.
      {/if}
    </p>

    <button
      type="button"
      class="more"
      aria-expanded={expanded}
      aria-controls="extension-guidance-details"
      onclick={() => (expanded = !expanded)}
    >
      More information
      <span class="chevron" class:up={expanded} aria-hidden="true">
        <ChevronDown size={16} />
      </span>
    </button>
  </div>

  <div class="details" id="extension-guidance-details" hidden={!expanded}>
    {#if status === "installed"}
      <p>
        Alerts are created right from the page you want to watch. Visit a
        webpage, trigger the <strong>Klaxon Cloud</strong> extension, and create a
        new alert. Klaxon then checks that page on the schedule you pick and archives
        every change it finds.
      </p>
      <p class="hint">
        Don&rsquo;t see the Klaxon icon? Open your browser&rsquo;s extensions
        menu and pin Klaxon to the toolbar.
      </p>
    {:else if store}
      <p>
        Klaxon watches pages you choose in the browser, so alerts start from the
        extension rather than from this site.
      </p>
      <ol class="steps">
        <li>
          Install the extension from
          <a href={store.url} target="_blank" rel="noopener"
            >your browser&rsquo;s store</a
          >.
        </li>
        <li>
          Pin the <strong>Klaxon Cloud</strong> icon to your browser toolbar.
        </li>
        <li>
          Open a page you want to watch, click the icon, and choose
          <strong>Create a new alert</strong>.
        </li>
      </ol>
    {:else}
      <p>
        Klaxon watches pages you choose in the browser, so alerts start from the
        extension rather than from this site. The extension is available for
        Chrome and Firefox; Safari isn&rsquo;t supported at this time.
      </p>
      <p class="hint">
        You can still review your alerts and their changes here from any
        browser.
      </p>
    {/if}
  </div>
</section>

<style>
  .guidance {
    width: 100%;
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    background: var(--white);
    padding: 0.75rem 1rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    /* The status text takes the slack, so "More information" sits at the far
       edge until the row is too narrow and the button drops below. */
    flex-wrap: wrap;
    --status-color: var(--red-3);
  }

  /* A success green, in the family of the extension's own; nothing else on the
     site needs it, so it stays local rather than becoming a shared token. */
  .row.ok {
    --status-color: #1f9e83;
  }

  .icon {
    display: inline-flex;
    flex: none;
    color: var(--status-color);
  }

  .status {
    flex: 1 1 16rem;
    margin: 0;
    font-weight: 600;
    line-height: 1.3;
    text-wrap: pretty;
  }

  .more {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--klaxon-color-link);
    cursor: pointer;
  }

  .more:hover {
    text-decoration: underline;
  }

  .chevron {
    display: inline-flex;
    transition: transform 150ms ease;
  }

  .chevron.up {
    transform: rotate(180deg);
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--gray-2);
  }

  .details[hidden] {
    display: none;
  }

  .details p {
    margin: 0;
    max-width: 40rem;
  }

  .steps {
    margin: 0;
    max-width: 40rem;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    line-height: 1.4;
  }

  .hint {
    color: var(--gray-4);
    font-size: var(--font-sm);
  }

  .spinner {
    display: inline-flex;
    opacity: 0.6;
    animation: spin 5s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner,
    .chevron {
      animation: none;
      transition: none;
    }
  }
</style>
