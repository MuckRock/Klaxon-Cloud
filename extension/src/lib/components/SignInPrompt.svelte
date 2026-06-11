<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Loading from "./Loading.svelte";
  import { authState, login, createAccount } from "../auth.svelte.ts";

  const loading = $derived(authState.status === "authenticating");
  // Authenticated-but-still-mounted is transient: the parent view reacts to the
  // auth flip and redirects. Showing a redirecting state here avoids flashing
  // the "Sign in" button in that gap.
  const authenticated = $derived(authState.status === "authenticated");
</script>

<div class="account">
  <p>Your alerts will be saved with your MuckRock account.</p>
  {#if loading}
    <Loading message="Signing you in…" />
  {:else if authenticated}
    <Loading message="Signed in!" />
  {:else}
    <button class="primary signIn" onclick={() => login()}>
      Sign in with MuckRock
    </button>
    <button class="secondary createAccount" onclick={() => createAccount()}>
      Create an account
    </button>
  {/if}
  {#if authState.status === "error" && authState.error}
    <p class="error" role="alert">
      <CircleAlert size={16} />
      <span>{authState.error}</span>
    </p>
  {/if}
  <p>Creating a MuckRock account is free.</p>
</div>

<style>
  .account {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1em;
  }
  .account p {
    margin: 0;
    text-wrap: pretty;
  }

  button.primary {
    width: 100%;
    padding: 10px 12px;
    color: var(--white);
    background: var(--blue-3);
    border: 1px solid var(--blue-4);
    border-radius: 0.5em;
    font-family: var(--font-sans);
    font-size: var(--font-lg);
    font-weight: 700;
    cursor: pointer;
  }

  button.primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  button.primary:hover,
  button.primary:focus {
    /* Darken slightly for hover feedback. */
    filter: brightness(0.9);
  }

  button.secondary {
    width: 100%;
    padding: 8px 12px;
    color: var(--blue-3);
    background: transparent;
    border: 1px solid var(--blue-4);
    border-radius: 0.5em;
    font-family: var(--font-sans);
    font-size: var(--font-lg);
    font-weight: 700;
    cursor: pointer;
  }

  button.secondary:hover,
  button.secondary:focus {
    background: var(--gray-1);
  }

  .error {
    display: flex;
    align-items: center;
    gap: 0.4em;
    color: #b91c1c;
    font-size: 12px;
    font-weight: 600;
    margin: 6px 0 0;
  }
</style>
