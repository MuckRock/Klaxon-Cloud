<script lang="ts">
  import { getRouter } from "../router.svelte";
  import { authState, logout } from "../auth.svelte.ts";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import logotype from "@klaxon/lib/assets/logotype.svg";
  import UserInfo from "./UserInfo.svelte";

  const router = getRouter();
  const history = $derived(router.history);

  const isLoggedIn = $derived(authState.status === "authenticated");
</script>

<header class="container">
  <div class="header">
    {#if history.length === 0}
      {#if isLoggedIn}
        <div class="auth">
          <UserInfo />
          <button class="signOut link" onclick={() => logout()}>Sign out</button
          >
        </div>
      {:else}
        <div class="logo">
          <img src={logotype} alt="Klaxon" />
        </div>
      {/if}
    {:else}
      <button class="back-link" type="button" onclick={() => router.back()}>
        <ArrowLeft size={16} />
        <span class="label">Back</span>
      </button>
    {/if}
  </div>
</header>

<style>
  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 2em;
    gap: 0.5em;
    padding: 0.75em 1em;
    border-top: 2px solid var(--red-3);
    background: var(--klaxon-bg-dark);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header .logo {
    margin: 0;
    flex: 1 1 auto;
    max-width: 9em;
    display: flex;
    align-items: center;
  }

  .header .logo img {
    display: block;
    width: 100%;
    height: auto;
  }

  .header button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0 4px;
    line-height: 1;

    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  button.back-link {
    color: var(--klaxon-color-link);
    font-feature-settings:
      "liga" off,
      "clig" off;
    font-family: inherit;
    font-size: var(--font-sm, 14px);
    font-style: normal;
    font-weight: 700;

    text-decoration: none;
  }

  .header button:hover {
    color: #000;
  }

  .auth {
    flex: 1 1 auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
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
