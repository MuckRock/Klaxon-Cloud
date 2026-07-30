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
  // browser. The full explanation lives behind "More information", since the
  // extension hand-off is worth spelling out but only once.
  //
  // Two contexts share the detection and the install call-to-action, and differ
  // only in the copy: "create" (the homepage) explains starting a new alert,
  // while "edit" (an alert's edit page) explains re-picking the watched region,
  // which also only the extension's canvas picker can do.
  interface Props {
    context?: "create" | "edit";
    // The watched page, named in the "edit" copy so the steps are concrete.
    site?: string;
  }

  const { context = "create", site }: Props = $props();

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

  // What the extension is needed for, which is all the status line differs on
  // between the two contexts.
  const lead = $derived(
    context === "edit"
      ? "Make page selections with the Klaxon extension"
      : "Alerts are created with the Klaxon extension",
  );

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
        {#if context === "edit"}
          The Klaxon extension is installed &mdash; update the selection from
          the page itself.
        {:else}
          The Klaxon extension is installed and ready.
        {/if}
      {:else if store}
        {lead} &mdash;
        <a href={store.url} target="_blank" rel="noopener">{store.label}</a>.
      {:else}
        {lead}, available for
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
      {#if context === "edit"}
        <p>
          The watched region is picked on the page itself, so it&rsquo;s edited
          in the extension rather than here. Open
          {#if site}<a href={site} target="_blank" rel="noopener noreferrer"
              >the watched page</a
            >{:else}the watched page{/if}, trigger the
          <strong>Klaxon Cloud</strong> extension, open this alert and choose
          <strong>Edit selection</strong>.
        </p>
      {:else}
        <p>
          Alerts are created right from the page you want to watch. Visit a
          webpage, trigger the <strong>Klaxon Cloud</strong> extension, and create
          a new alert. Klaxon then checks that page on the schedule you pick and archives
          every change it finds.
        </p>
      {/if}
      <p class="hint">
        Don&rsquo;t see the Klaxon icon? Open your browser&rsquo;s extensions
        menu and pin Klaxon to the toolbar.
      </p>
    {:else if store}
      {#if context === "edit"}
        <p>
          The address, schedule, name and Slack webhook are editable here, and
          so is the raw selector. <em>Picking</em> the watched region on the page
          itself requires the browser extension.
        </p>
      {:else}
        <p>
          Klaxon watches pages you choose in the browser, so alerts start from
          the extension rather than from this site.
        </p>
      {/if}
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
        {#if context === "edit"}
          <li>
            Open
            {#if site}<a href={site} target="_blank" rel="noopener noreferrer"
                >the watched page</a
              >{:else}the watched page{/if}, click the icon, open this alert and
            choose <strong>Edit selection</strong>.
          </li>
        {:else}
          <li>
            Open a page you want to watch, click the icon, and choose
            <strong>Create a new alert</strong>.
          </li>
        {/if}
      </ol>
    {:else}
      {#if context === "edit"}
        <p>
          The watched region is picked in the browser, so changing it needs the
          extension&rsquo;s picker. It&rsquo;s available for Chrome and Firefox;
          Safari isn&rsquo;t supported at this time.
        </p>
        <p class="hint">
          The address, schedule, name, Slack webhook and raw selector are still
          editable here from any browser.
        </p>
      {:else}
        <p>
          Klaxon watches pages you choose in the browser, so alerts start from
          the extension rather than from this site. The extension is available
          for Chrome and Firefox; Safari isn&rsquo;t supported at this time.
        </p>
        <p class="hint">
          You can still review your alerts and their changes here from any
          browser.
        </p>
      {/if}
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
    gap: 1rem;
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
    align-self: flex-start;
    margin-top: 0.05em;
    display: inline-flex;
    flex: none;
    color: var(--status-color);
  }

  .status {
    flex: 1 1 8rem;
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
