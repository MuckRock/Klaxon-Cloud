<script lang="ts">
  import type { Snippet } from "svelte";
  import { authState, login, logout } from "../auth.svelte.ts";
  import Siren from "./Siren.svelte";
  import UserInfo from "./UserInfo.svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  const isLoggedIn = $derived(authState.status === "authenticated");
</script>

{#if isLoggedIn}
  <div class="auth">
    <UserInfo />
    <button class="signOut link" onclick={() => logout()}>Sign out</button>
  </div>
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
    <div class="account">
      <p>Your alerts will be saved with your MuckRock account.</p>
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
      <p>
        If you don't have a MuckRock account, you can create one for free when
        signing in.
      </p>
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
  }
  .introduction,
  .account,
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

  button.primary {
    width: 100%;
    padding: 8px 12px;
    color: var(--white);
    background: var(--blue-3);
    border: 1px solid var(--blue-4);
    border-radius: 0.5em;
    font-size: var(--font-sm);
    font-weight: 600;
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

  .auth {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1em;
  }

  .signOut.link {
    background: none;
    border: none;
    text-decoration: underline;
    color: var(--klaxon-color-link);
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: var(--font-xs);
    cursor: pointer;
    padding: 0;
  }
</style>
