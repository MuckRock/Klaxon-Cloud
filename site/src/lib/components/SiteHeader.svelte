<script lang="ts">
  import logotype from "@klaxon/lib/assets/logotype.svg";
  import HelpMenu from "@klaxon/lib/components/HelpMenu.svelte";
  import { page } from "$app/state";
  import { userState } from "$lib/user.svelte";
  import { profileUrl } from "$lib/user";

  let {
    authenticated,
    accountsHost,
  }: { authenticated: boolean; accountsHost: string } = $props();

  // The name comes from the client-side store (localStorage); fall back to a
  // neutral label if it isn't cached yet.
  const label = $derived(
    userState.user?.name || userState.user?.email || "Account",
  );

  const accountUrl = $derived(profileUrl(accountsHost, userState.user));
</script>

<header class="site-header">
  <div class="inner">
    <a class="brand" href="/">
      <img src={logotype} alt="Klaxon" />
    </a>

    {#if authenticated}
      <nav class="sections" aria-label="Sections">
        <a class="nav-link" href="/alerts/">Alerts</a>
        <a class="nav-link" href="/activity/">Activity</a>
      </nav>
    {/if}

    <div class="account">
      {#if authenticated}
        <a
          class="user nav-link"
          href={accountUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {#if userState.user?.picture}
            <img class="avatar" src={userState.user.picture} alt="" />
          {/if}
          {label}
        </a>
        <form method="POST" action="/auth/logout">
          <button type="submit" class="link">Sign out</button>
        </form>
      {:else}
        <a class="nav-link" href="/auth/login">Sign in</a>
      {/if}

      <HelpMenu
        user={userState.user}
        client="Web app"
        details={{ Page: page.url.href }}
      />
    </div>
  </div>
</header>

<style>
  .site-header {
    border-top: 3px solid var(--red-3);
    background: var(--klaxon-bg-dark);
  }

  /* The logo and the section links share the left side; the auto margins push
     the account block to the right. */
  .inner {
    max-width: 64rem;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .brand {
    display: flex;
    align-items: center;
  }

  .brand img {
    display: block;
    height: 2rem;
    width: auto;
  }

  .sections {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-right: auto;
  }

  .account {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .avatar {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    object-fit: cover;
  }

  .nav-link {
    color: var(--klaxon-color-link);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--font-md);
  }

  .nav-link:hover {
    text-decoration: underline;
    color: var(--black);
  }

  .user {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: var(--font-md);
    font-weight: 600;
    margin-right: 1rem;
  }

  form {
    margin: 0;
  }

  button.link {
    background: none;
    border: none;
    padding: 0;
    color: var(--klaxon-color-link);
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: var(--font-sm);
    cursor: pointer;
    &:hover {
      color: var(--black);
    }
  }

  /* Narrow screens get three centered rows: logo, sections, account. */
  @media (max-width: 32rem) {
    .inner {
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
    }

    .sections,
    .account {
      margin: 0;
      justify-content: center;
      flex-wrap: wrap;
    }
  }
</style>
