<script lang="ts">
  // A "Help" dropdown for the right of the top navigation, shared by the site
  // header and the extension panel header. The three items are our three ways
  // to get help, in the order we want them tried: guide, FAQ, then support.
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";
  import Mail from "@lucide/svelte/icons/mail";
  import MessageCircleQuestionMark from "@lucide/svelte/icons/message-circle-question-mark";

  import { HELP_FAQ_URL, HELP_GUIDE_URL, supportMailto, type SupportContext } from "../help";

  interface Props extends SupportContext {
    /**
     * Opens a chosen link instead of letting the browser follow the anchor.
     * The extension passes `chrome.tabs.create` — the side panel is an
     * extension page, and handing the URL (especially the `mailto:`) to the
     * browser explicitly is more reliable there than navigating the panel.
     */
    openUrl?: (url: string) => void;
  }

  let { user = null, client, details, openUrl }: Props = $props();

  let open = $state(false);
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;

  const mailto = $derived(supportMailto({ user, client, details }));

  function close(refocus = false) {
    open = false;
    if (refocus) trigger?.focus();
  }

  function select(event: MouseEvent, url: string) {
    if (openUrl) {
      event.preventDefault();
      openUrl(url);
    }
    close();
  }

  // While the menu is open, a click anywhere outside it or an Escape keypress
  // dismisses it. Listeners only exist for as long as the menu does.
  $effect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!root.contains(event.target as Node)) close();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });
</script>

<div class="help" bind:this={root}>
  <button
    class="trigger"
    type="button"
    bind:this={trigger}
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <CircleQuestionMark size={24} />
    <span class="sr-only">Help</span>
    <span class="chevron" class:up={open}><ChevronDown size={14} /></span>
  </button>

  {#if open}
    <!-- Focus leaving the whole menu closes it, so tabbing past the last item
         doesn't leave an orphaned panel open behind the user. -->
    <div
      class="menu"
      onfocusout={(event) => {
        if (!root.contains(event.relatedTarget as Node)) close();
      }}
    >
      <a
        href={HELP_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onclick={(event) => select(event, HELP_GUIDE_URL)}
      >
        <BookOpen size={16} />
        <span>
          <strong>User Guide</strong>
        </span>
      </a>

      <a
        href={HELP_FAQ_URL}
        target="_blank"
        rel="noopener noreferrer"
        onclick={(event) => select(event, HELP_FAQ_URL)}
      >
        <MessageCircleQuestionMark size={16} />
        <span>
          <strong>FAQ</strong>
        </span>
      </a>

      <a href={mailto} onclick={(event) => select(event, mailto)}>
        <Mail size={16} />
        <span>
          <strong>Contact support</strong>
        </span>
      </a>
    </div>
  {/if}
</div>

<style>
  .help {
    position: relative;
    display: flex;
    align-items: center;
  }

  .trigger {
    display: flex;
    align-items: center;
    gap: 0.375em;
    margin: 0 1rem;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--klaxon-color-link, #c41a4d);
    font-family: var(--font-sans);
    font-size: var(--font-md, 16px);
    font-weight: 600;
    line-height: 1.4;
  }

  .trigger:hover {
    color: var(--black, #000);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .chevron {
    display: inline-flex;
    transition: transform 150ms ease;
  }

  .chevron.up {
    transform: rotate(180deg);
  }

  /* Hangs from the trigger's right edge so the menu stays inside the viewport
     even in the extension's narrow panel. */
  .menu {
    position: absolute;
    top: calc(100% + 0.5em);
    right: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    width: max-content;
    max-width: min(18rem, calc(100vw - 2rem));
    padding: 0.25em;
    background: var(--white, #fff);
    border: 1px solid var(--gray-2, #d8dee2);
    border-radius: var(--klaxon-border-radius, 0.5rem);
    box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
  }

  .menu a {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
    padding: 0.5em;
    border-radius: calc(var(--klaxon-border-radius, 0.5rem) - 0.25em);
    color: inherit;
    text-decoration: none;
  }

  .menu a:hover,
  .menu a:focus-visible {
    background: var(--klaxon-bg-dark, #fff5e3);
  }

  /* The icon sits on the first line of the label, not centered on the pair. */
  .menu a :global(svg) {
    flex: none;
    margin-top: 0.125em;
    color: var(--klaxon-color-link, #c41a4d);
  }

  .menu a span {
    display: flex;
    flex-direction: column;
  }

  .menu strong {
    font-size: var(--font-sm, 14px);
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
</style>
