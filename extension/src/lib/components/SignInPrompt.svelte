<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Loader from "@lucide/svelte/icons/loader";
  import { authState, login } from "../auth.svelte.ts";

  const loading = $derived(authState.status === "authenticating");
  // Authenticated-but-still-mounted is transient: the parent view reacts to the
  // auth flip and redirects. Showing a redirecting state here avoids flashing
  // the "Sign in" button in that gap.
  const authenticated = $derived(authState.status === "authenticated");
</script>

<div class="account">
  <p>Your alerts will be saved with your MuckRock account.</p>
  {#if loading}
    <p class="signing-in">
      <span class="spinner"><Loader size={20} /></span>
      <span class="label">Signing you in…</span>
    </p>
  {:else if authenticated}
    <p class="signing-in">
      <span class="spinner"><Loader size={20} /></span>
      <span class="label">Signed in!</span>
    </p>
  {:else}
    <button class="primary signIn" onclick={() => login()}>
      Sign in with MuckRock
    </button>
  {/if}
  {#if authState.status === "error" && authState.error}
    <p class="error" role="alert">
      <CircleAlert size={16} />
      <span>{authState.error}</span>
    </p>
  {/if}
  <p>
    If you don't have a MuckRock account, you can create one for free when
    signing in.
  </p>
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
    padding: 8px 12px;
    color: var(--white);
    background: var(--blue-3);
    border: 1px solid var(--blue-4);
    border-radius: 0.5em;
    font-family: var(--font-sans);
    font-size: var(--font-md);
    font-weight: 600;
    cursor: pointer;
  }

  button.primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  button.primary:hover,
  button.primary:focus {
    background: var(--blue-4);
  }

  .signing-in {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    font-weight: 700;
    color: var(--red-3);
    cursor: default;
  }

  /* Faded so the icon reads as a subtle in-progress hint next to the bolder
     label. Wrapping span carries the spin so the SVG inherits currentColor. */
  .spinner {
    display: inline-flex;
    opacity: 0.5;
    animation: spin 5s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
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
