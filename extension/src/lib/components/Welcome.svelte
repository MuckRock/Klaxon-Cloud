<script lang="ts">
  import type { Snippet } from "svelte";
  import Siren from "./Siren.svelte";
  import SignInPrompt from "./SignInPrompt.svelte";
  import { authState } from "../auth.svelte.ts";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  const isLoggedIn = $derived(authState.status === "authenticated");
</script>

{#if isLoggedIn}
  {@render children()}
{:else}
  <div class="container">
    <div class="introduction">
      <Siren />
      <h3 class="head">Welcome to Klaxon!</h3>
      <p class="lede">
        Klaxon monitors web pages for you and alerts you when they’ve changed.
      </p>
    </div>
    <div class="sign-in">
      <SignInPrompt />
    </div>
    <div class="get-started">
      <p>
        Want to dive in and monitor this page for changes? We can set up your
        account later.
      </p>
      <p><strong>Let's get started.</strong></p>
    </div>
  </div>
{/if}

<style>
  .container {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
  }
  .introduction,
  .get-started {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1em;
    & p {
      margin: 0;
      text-wrap: pretty;
    }
  }
  .introduction .head {
    flex: 1 1 auto;
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    margin: 0;
    font-size: var(--font-xl);
    font-weight: 600;
    line-height: normal;
  }
  .introduction .lede {
    margin: 0;
    font-size: var(--font-md);
    font-style: normal;
    font-weight: 400;
    line-height: 1.75;
  }

  .get-started strong {
    font-weight: 600;
  }

  .sign-in {
    margin: 0 0.25em;
    padding: 1.5em 0.75em;
  }
</style>
