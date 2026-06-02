<script lang="ts">
  import type { Snippet } from "svelte";
  import { type View, getRouter } from "../router.svelte";

  const router = getRouter();

  interface Props {
    view: View;
    children: Snippet;
    [key: string]: any;
  }

  const { view, children, ...rest }: Props = $props();
</script>

<button class="link" type="button" onclick={() => router.navigate(view, rest)}>
  {@render children()}
</button>

<style>
  button.link {
    border: none;
    padding: 0;
    background: none;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    cursor: pointer;
    color: var(--klaxon-color-link, #c41a4d);
    text-decoration: underline;
    font-weight: bold;
  }
</style>
