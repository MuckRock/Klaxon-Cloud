<script lang="ts">
  import type { Event } from "@klaxon/lib/types";
  import type { PageProps } from "./$types";

  import { schedules } from "@klaxon/lib/api";
  import { getSiteLabel } from "@klaxon/lib/utils";

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
    const byDomain = new Map<string, Event[]>();
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
              <a
                class="row-title"
                href={event.parameters.site}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getSiteLabel(event)}
              </a>
              <span class="schedule {schedules[event.event]}">
                {schedules[event.event]}
              </span>
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
    border-bottom: 1px solid var(--gray-2);
    padding-bottom: 0.25rem;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 0.75rem;
  }

  .row + .row {
    border-top: 1px solid var(--gray-2);
  }

  .row-title {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: var(--font-sm);
    font-weight: 600;
  }

  .schedule {
    flex: none;
    font-size: var(--font-xs);
    color: var(--gray-4);
    text-transform: capitalize;
  }

  .schedule.disabled {
    opacity: 0.7;
  }
</style>
