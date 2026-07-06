<script lang="ts">
  import type { PageProps } from "./$types";
  import { userState } from "$lib/user.svelte";
  import ExtensionGuidance from "$lib/components/ExtensionGuidance.svelte";

  let { data }: PageProps = $props();

  const name = $derived(
    userState.user?.name || userState.user?.email || "there",
  );
</script>

<svelte:head>
  <title>Klaxon Cloud — get notified when web pages change</title>
</svelte:head>

<ExtensionGuidance />
{#if data.authenticated}
  <section class="welcome">
    <h1>Welcome back, {name}.</h1>
    <p>Jump into your alerts and recent activity.</p>
    <div class="actions">
      <a class="btn-primary" href="/alerts/">View your alerts</a>
      <a class="nav-link" href="/activity">Recent activity</a>
    </div>
  </section>
{:else}
  <section class="hero">
    <h1>Know the moment a web page changes.</h1>
    <p class="lede">
      Klaxon watches the pages you care about — a court docket, an agency
      notice, a pricing page — and tells you when something changes. Set an
      alert, and we check on a schedule and capture the difference.
    </p>
    <div class="actions">
      <a class="btn-primary" href="/auth/login">Sign in with MuckRock</a>
      <a class="nav-link" href="/auth/login?create=1">Create an account</a>
    </div>
  </section>

  <section class="features">
    <div class="feature">
      <h2>Monitor anything</h2>
      <p>
        Watch a whole page or just the region you pick with the browser
        extension.
      </p>
    </div>
    <div class="feature">
      <h2>On your schedule</h2>
      <p>
        Check hourly, daily, or weekly. We only ping you when something actually
        changes.
      </p>
    </div>
    <div class="feature">
      <h2>See what changed</h2>
      <p>
        Every detected change is archived with a visual diff so you can review
        the difference.
      </p>
    </div>
  </section>
{/if}

<style>
  .hero {
    text-align: center;
    padding: 2rem 0 3rem;
  }

  .hero h1 {
    font-size: 2.5rem;
    color: var(--red-4);
    margin: 0 0 1rem;
  }

  .lede {
    max-width: 38rem;
    margin: 0 auto 2rem;
    font-size: var(--font-lg);
    color: var(--gray-4);
  }

  .actions {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .nav-link {
    font-weight: 600;
    text-decoration: none;
  }

  .nav-link:hover {
    text-decoration: underline;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .feature {
    background: var(--white);
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    padding: 1.25rem;
  }

  .feature h2 {
    font-size: var(--font-lg);
    margin: 0 0 0.5rem;
    color: var(--red-4);
  }

  .feature p {
    margin: 0;
    color: var(--gray-4);
  }

  .welcome {
    padding: 2rem 0;
  }

  .welcome h1 {
    color: var(--red-4);
  }
</style>
