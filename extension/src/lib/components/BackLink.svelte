<script lang="ts">
  import { type View, getRouter } from "../router.svelte";

  const router = getRouter();

  interface Props {
    view: View;
    [key: string]: any;
  }

  const { view, ...rest }: Props = $props();
</script>

<button
  class="back-link"
  type="button"
  onclick={() => router.navigate(view, rest)}
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
