<script lang="ts">
  import type { PageProps } from "./$types";
  import type { Event, Run } from "@klaxon/lib/types";
  import { schedules } from "@klaxon/lib/api";
  import { getDomain, getRelativeTime, getRunTime } from "@klaxon/lib/utils";
  import Loading from "@klaxon/lib/components/Loading.svelte";
  import Siren from "@klaxon/lib/components/Siren.svelte";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import FileDiff from "@lucide/svelte/icons/file-diff";
  import SquareDashedMousePointer from "@lucide/svelte/icons/square-dashed-mouse-pointer";
  import { userState } from "$lib/user.svelte";
  import ChangeList from "$lib/components/ChangeList.svelte";
  import ExtensionGuidance from "$lib/components/ExtensionGuidance.svelte";
  import StatCard from "$lib/components/StatCard.svelte";

  let { data }: PageProps = $props();

  const name = $derived(
    userState.user?.name || userState.user?.email || "there",
  );

  // Alerts arrive complete, so these counts are exact.
  function alertStats(alerts: Event[]) {
    const active = alerts.filter(
      (alert) => schedules[alert.event] !== "disabled",
    ).length;
    const domains = new Set(alerts.map((alert) => getDomain(alert) ?? "Other"));

    return {
      total: alerts.length,
      active,
      paused: alerts.length - active,
      domains: domains.size,
    };
  }

  // Changes are cursor-paginated with no total: report what this page holds, and
  // mark it "25+" when the API says there's another page behind it.
  function changeStats(changes: { results: Run[]; next: string | null }) {
    const latest = getRunTime(changes.results[0]);

    return {
      count: `${changes.results.length}${changes.next ? "+" : ""}`,
      latest: latest ? `latest ${getRelativeTime(latest)}` : undefined,
    };
  }
</script>

<svelte:head>
  <title>Klaxon Cloud — get notified when web pages change</title>
</svelte:head>

<div class="guidance-slot">
  <ExtensionGuidance />
</div>

{#if data.authenticated}
  <section class="dashboard">
    <h1>Welcome back, {name}.</h1>

    <div class="stats">
      {#await data.alerts then alerts}
        {@const stats = alertStats(alerts ?? [])}
        <StatCard
          value={stats.total}
          label={stats.total === 1 ? "Alert" : "Alerts"}
          hint="{stats.active} active · {stats.paused} paused"
          href="/alerts/"
        />
        <StatCard
          value={stats.domains}
          label={stats.domains === 1 ? "Site watched" : "Sites watched"}
          href="/alerts/"
        />
      {/await}
      {#await data.changes then changes}
        {@const stats = changeStats(changes ?? { results: [], next: null })}
        <StatCard
          value={stats.count}
          label="Recent changes"
          hint={stats.latest}
          href="/activity/"
        />
      {/await}
    </div>

    <section class="recent">
      <div class="section-head">
        <h2>Recent changes</h2>
        <a class="all-link" href="/activity/">All activity</a>
      </div>

      {#await data.changes}
        <Loading message="Loading recent changes…" />
      {:then changes}
        {@const runs = changes?.results ?? []}
        {#if runs.length === 0}
          <p class="empty">
            No changes detected yet. Once one of your alerts spots a change,
            it'll show up here.
          </p>
        {:else}
          <ChangeList changes={runs} />
        {/if}
      {:catch}
        <p class="empty">Couldn’t load recent changes. Try again.</p>
      {/await}
    </section>
  </section>
{:else}
  <section class="hero">
    <Siren />
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
      <h2><SquareDashedMousePointer size={20} /> Monitor anything</h2>
      <p>
        Watch a whole page or just the region you pick with the browser
        extension.
      </p>
    </div>
    <div class="feature">
      <h2><CalendarClock size={20} /> On your schedule</h2>
      <p>
        Check hourly, daily, or weekly. We only ping you when something actually
        changes.
      </p>
    </div>
    <div class="feature">
      <h2><FileDiff size={20} /> See what changed</h2>
      <p>
        Every detected change is archived with a visual diff so you can review
        the difference.
      </p>
    </div>
  </section>
{/if}

<style>
  .guidance-slot {
    margin: 1rem 0 2rem 0;
  }

  .hero {
    text-align: center;
    padding: 1rem 0 3rem;
    /* The siren's beams use a negative z-index to slide behind the headline;
       isolating here keeps them from dropping behind the page background. */
    isolation: isolate;
    /* Scale the shared siren up from its extension defaults, and pull the
       headline into the glow. */
    --siren-height: 22em;
    --siren-size: 12em;
    --siren-offset: -6em;
  }

  .hero h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1.15;
    text-wrap: balance;
    color: var(--red-4);
    max-width: 34rem;
    margin: 0 auto 1rem;
  }

  .lede {
    max-width: 38rem;
    margin: 0 auto 2rem;
    font-size: var(--font-lg);
    text-wrap: pretty;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--font-lg);
    margin: 0 0 0.5rem;
    color: var(--red-4);
  }

  .feature p {
    margin: 0;
    color: var(--gray-4);
  }

  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .dashboard h1 {
    margin: 0;
    font-size: var(--font-xl);
    color: var(--red-4);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 1rem;
  }

  .recent {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .section-head h2 {
    margin: 0;
    font-size: var(--font-lg);
    font-weight: 700;
  }

  .all-link {
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .empty {
    color: var(--gray-4);
  }
</style>
