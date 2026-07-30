<script lang="ts">
  // The one action that leaves Klaxon: opening the watched page itself. Labelled
  // and iconed so it reads as "this goes somewhere else, in a new tab" next to
  // the in-app links around it.
  import ExternalLink from "@lucide/svelte/icons/external-link";

  interface Props {
    href: string;
    label?: string;
  }

  let { href, label = "Open page" }: Props = $props();
</script>

<a class="open-page" {href} target="_blank" rel="noopener noreferrer">
  {label}
  <ExternalLink size={14} />
</a>

<style>
  .open-page {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    font-size: var(--font-sm);
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }

  .open-page:hover {
    text-decoration: underline;
  }
</style>
