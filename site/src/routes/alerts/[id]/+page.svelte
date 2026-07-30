<script lang="ts">
  import type { PageProps } from "./$types";
  import { schedules } from "@klaxon/lib/api";
  import { getDomain, getSite, getSiteLabel } from "@klaxon/lib/utils";
  import Loading from "@klaxon/lib/components/Loading.svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";

  import ChangeList from "$lib/components/ChangeList.svelte";
  import CursorPager from "$lib/components/CursorPager.svelte";
  import OpenPageLink from "$lib/components/OpenPageLink.svelte";

  let { data }: PageProps = $props();

  const alert = $derived(data.alert);
  const label = $derived(getSiteLabel(alert) ?? "Alert");
  const domain = $derived(getDomain(alert));
  const path = $derived(getSite(alert));
  const schedule = $derived(schedules[alert.event]);
</script>

<svelte:head>
  <title>{label} | Klaxon Cloud</title>
</svelte:head>

<div class="alert-page">
  <a class="back" href="/alerts/">
    <ArrowLeft size={16} />
    All alerts
  </a>

  <header class="head">
    <div class="identity">
      <h1>{label}</h1>
      <p class="site">{domain}{path === label ? "" : path}</p>
    </div>
    <div class="actions">
      <span class="schedule {schedule}">{schedule}</span>
      <OpenPageLink href={alert.parameters.site} label="Open watched page" />
    </div>
  </header>

  <section class="changes">
    <h2>Changes</h2>

    {#await data.changes}
      <Loading message="Loading changes…" />
    {:then page}
      {@const changes = page?.results ?? []}
      {#if changes.length === 0}
        <p class="empty">
          No changes detected yet. Klaxon checks this page {schedule ===
          "disabled"
            ? "when the alert is re-enabled"
            : schedule}.
        </p>
      {:else}
        <!-- Every run here belongs to this one alert, so don't repeat its
             address on each row, and don't link each title back to this page. -->
        <ChangeList {changes} showSite={false} linkAlert={false} />

        <CursorPager prev={page?.previous} next={page?.next} />
      {/if}
    {:catch}
      <p class="empty">Couldn’t load changes. Try again.</p>
    {/await}
  </section>
</div>

<style>
  .alert-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    align-self: start;
    font-size: var(--font-sm);
    font-weight: 600;
    text-decoration: none;
  }

  .back:hover {
    text-decoration: underline;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .identity {
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: var(--font-xl);
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .site {
    margin: 0.25rem 0 0;
    font-size: var(--font-sm);
    color: var(--gray-4);
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .schedule {
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--gray-4);
    text-transform: capitalize;
  }

  .schedule.disabled {
    opacity: 0.7;
  }

  .changes {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: var(--font-lg);
    font-weight: 700;
  }

  .empty {
    color: var(--gray-4);
  }
</style>
