<script lang="ts">
  import { userState } from "$lib/user.svelte";

  let { authenticated }: { authenticated: boolean } = $props();

  // The name comes from the client-side store (localStorage); fall back to a
  // neutral label if it isn't cached yet.
  const label = $derived(
    userState.user?.name || userState.user?.email || "Account",
  );
</script>

<header class="site-header">
  <div class="inner">
    <a class="wordmark" href="/">
      <span class="mark">Klaxon</span><span class="cloud">Cloud</span>
    </a>

    <nav>
      {#if authenticated}
        <a class="nav-link" href="/alerts/">Alerts</a>
        <a class="nav-link" href="/activity/">Activity</a>
        <span class="user">{label}</span>
        <form method="POST" action="/auth/logout">
          <button type="submit" class="link">Sign out</button>
        </form>
      {:else}
        <a class="nav-link" href="/auth/login">Sign in</a>
      {/if}
    </nav>
  </div>
</header>

<style>
  .site-header {
    border-top: 3px solid var(--red-3);
    background: var(--klaxon-bg-dark);
  }

  .inner {
    max-width: 64rem;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .wordmark {
    text-decoration: none;
    font-weight: 700;
    font-size: var(--font-lg);
    color: var(--red-4);
    display: inline-flex;
    gap: 0.25em;
  }

  .wordmark .cloud {
    color: var(--gray-4);
    font-weight: 600;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .nav-link {
    color: var(--klaxon-color-link);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--font-sm);
  }

  .nav-link:hover {
    text-decoration: underline;
  }

  .user {
    font-size: var(--font-sm);
    color: var(--gray-4);
  }

  form {
    margin: 0;
  }

  button.link {
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline;
    color: var(--klaxon-color-link);
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: var(--font-sm);
    cursor: pointer;
  }
</style>
