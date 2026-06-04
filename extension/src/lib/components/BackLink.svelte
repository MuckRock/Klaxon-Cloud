<script lang="ts">
  import { type View, getRouter } from "../router.svelte";

  interface Props {
    fallback: View;
    [key: string]: any;
  }

  const router = getRouter();

  const { fallback: fallback, ...rest }: Props = $props();
</script>

<button
  class="back-link"
  type="button"
  onclick={() => router.back(fallback, rest)}
>
  &#8249; <span>Back</span>
</button>

<style>
  button.back-link {
    align-self: flex-start;

    color: var(--klaxon-color-link, #c41a4d);
    font-feature-settings:
      "liga" off,
      "clig" off;
    font-family: inherit;
    font-size: var(--font-sm, 14px);
    font-style: normal;
    font-weight: 700;
    line-height: 1.1875rem; /* 135.714% */

    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-skip-ink: none;
    text-decoration-thickness: auto;
    text-underline-offset: auto;
    text-underline-position: from-font;
  }
</style>
