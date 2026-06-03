<script lang="ts">
  import type { Snippet } from "svelte";
  import { authState, login } from "../auth.svelte.ts";
  import Siren from "./Siren.svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  const isLoggedIn = $derived(authState.status === "authenticated");
</script>

{#if isLoggedIn}
  <h3>Welcome back to Klaxon!</h3>
  {@render children()}
{:else}
  <div class="introduction">
    <Siren />
    <h3>Welcome to Klaxon!</h3>
    <p>Klaxon monitors web pages for you and alerts you when they’ve changed.</p>
  </div>
  <div class="account">
    <p>Your alerts will be saved to your MuckRock account.</p>
    {#if authState.status === "authenticating"}
      <p>Signing in…</p>
    {:else}
      <button class="primary signIn" onclick={() => login()}>
        Sign in with MuckRock
      </button>
    {/if}
    {#if authState.status === "idle" && authState.error}
      <p class="error">{authState.error}</p>
    {/if}
  </div>
{/if}

<style>
  .introduction {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1em;
  }
  h3 {
    font-size: var(--font-lg);
  }
  button.primary {
    width: 100%;
    padding: 8px 12px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  button.primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .error {
    color: #b91c1c;
    font-size: 12px;
    margin: 6px 0 0;
  }
</style>