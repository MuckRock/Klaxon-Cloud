<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import type { Event } from "@klaxon/lib/types";
  import type { PageProps } from "./$types";

  import AlertListItem from "$lib/components/AlertListItem.svelte";

  let { data }: PageProps = $props();

  let alerts = $derived(data.alerts?.results ?? []);

  // The domain we group an alert under: the hostname of the watched URL, with a
  // leading "www." dropped so "www.example.com" and "example.com" sit together.
  // Falls back to the raw site string if it isn't a parseable URL.
  function getDomain(event: Event): string {
    const site = event.parameters.site;
    if (!site) return "Other";
    try {
      return new URL(site).hostname.replace(/^www\./, "");
    } catch {
      return site;
    }
  }

  // Group alerts by domain, then sort the domains alphabetically so the list is
  // stable and scannable.
  let groups = $derived.by(() => {
    const byDomain = new SvelteMap<string, Event[]>();
    for (const event of alerts) {
      const domain = getDomain(event);
      const list = byDomain.get(domain);
      if (list) list.push(event);
      else byDomain.set(domain, [event]);
    }

    return [...byDomain.entries()]
      .map(([domain, events]) => ({ domain, events }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  });
</script>

<svelte:head>
  <title>Alerts | Klaxon Cloud</title>
</svelte:head>

<div class="alerts">
  <h1>Alerts</h1>

  {#if alerts.length === 0}
    <p class="empty">
      You aren't watching any pages yet. Use the Klaxon extension to start an
      alert.
    </p>
  {:else}
    {#each groups as { domain, events } (domain)}
      <section class="group">
        <h2 class="domain">{domain}</h2>
        <ul class="rows">
          {#each events as event (event.id)}
            <li class="row">
              <AlertListItem {event} />
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
</div>

<style>
  .alerts {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h1 {
    margin: 0;
    font-size: var(--font-xl);
    font-weight: 700;
  }

  .empty {
    color: var(--gray-4);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .domain {
    margin: 0;
    font-size: var(--font-md);
    font-weight: 600;
    color: var(--gray-4);
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--white);
    border: 1px solid var(--gray-2);
    border-radius: var(--klaxon-border-radius);
    overflow: hidden;
  }

  .row {
    padding: 0.625rem 0.75rem;
  }

  .row + .row {
    border-top: 1px solid var(--gray-2);
  }
</style>
