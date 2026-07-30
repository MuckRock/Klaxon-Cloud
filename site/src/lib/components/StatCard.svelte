<script lang="ts">
  interface Props {
    // The headline number (or short string, e.g. "25+").
    value: string | number;
    label: string;
    // Optional second line: a breakdown or freshness hint.
    hint?: string;
    // When set, the whole card becomes a link to that section.
    href?: string;
  }

  let { value, label, hint, href }: Props = $props();
</script>

<!-- svelte:element keeps one set of styles for both the linked and plain card. -->
<svelte:element
  this={href ? "a" : "div"}
  {href}
  class="stat"
  class:linked={Boolean(href)}
>
  <span class="value">{value}</span>
  <span class="label">{label}</span>
  {#if hint}
    <span class="hint">{hint}</span>
  {/if}
</svelte:element>

<style>
  .stat {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.125rem 1rem;
    padding: 1rem 1.25rem;
    background: var(--white);
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    color: inherit;
    text-decoration: none;
  }

  .stat.linked:hover {
    border-color: var(--red-3);
  }

  .value {
    flex: 1 1 100%;
    font-size: var(--font-xl);
    font-weight: 700;
    line-height: 1.2;
    color: var(--red-4);
  }

  .label {
    flex: 1 1 auto;
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .hint {
    flex: 0 1 auto;
    font-size: var(--font-xs);
    color: var(--gray-4);
  }
</style>
