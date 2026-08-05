<script lang="ts">
  import { getRouter } from "../router.svelte";
  import { authState, logout } from "../auth.svelte.ts";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import logotype from "@klaxon/lib/assets/logotype.svg";
  import HelpMenu from "@klaxon/lib/components/HelpMenu.svelte";
  import UserInfo from "./UserInfo.svelte";

  const router = getRouter();
  const history = $derived(router.history);

  const isLoggedIn = $derived(authState.status === "authenticated");

  // Support details: which build is asking, and from which browser — the two
  // things we'd otherwise have to write back and ask for.
  const CLIENT = `Browser extension ${chrome.runtime.getManifest().version}`;

  const user = $derived(
    authState.user
      ? {
          name: authState.user.name,
          email: authState.user.email,
          username:
            authState.user.preferred_username || authState.user.nickname,
          uuid: authState.user.uuid,
        }
      : null,
  );
</script>

<header class="container">
  <div class="header">
    <div class="start">
      {#if history.length === 0}
        {#if isLoggedIn}
          <div class="auth">
            <UserInfo />
            <button class="signOut link" onclick={() => logout()}
              >Sign out</button
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

    <!-- The panel is an extension page: hand links to the browser rather than
         navigating the panel itself away from the app. -->
    <HelpMenu
      {user}
      client={CLIENT}
      details={{ Browser: navigator.userAgent }}
      openUrl={(url) => chrome.tabs.create({ url })}
    />
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
    gap: 0.5em;
  }

  /* Whatever the view puts on the left (account, logo, or Back); the help menu
     keeps the right edge to itself. */
  .start {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
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

  /* Name then Sign out, wrapping to a second line when the panel is too narrow
     for both (the help menu holds the right edge, so they can't spread out). */
  .auth {
    flex: 1 1 auto;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 0.5em;
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
