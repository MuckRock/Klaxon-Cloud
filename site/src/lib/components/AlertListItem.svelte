<script lang="ts">
  import { schedules } from "@klaxon/lib/api";
  import type { Event } from "@klaxon/lib/types";
  import { getSiteLabel, getSite } from "@klaxon/lib/utils";

  import OpenPageLink from "./OpenPageLink.svelte";

  interface Props {
    event: Event;
  }

  let { event }: Props = $props();
</script>

<div class="alert">
  <div class="details">
    <!-- The label leads to this alert's changes inside Klaxon; leaving for the
         watched page itself is the separate action on the right. -->
    <a class="title" href="/alerts/{event.id}/">
      {getSiteLabel(event)}
    </a>
    {#if event.parameters.title}
      <p class="site">
        {getSite(event)}
      </p>
    {/if}
  </div>
  <div class="actions">
    <OpenPageLink href={event.parameters.site} label="Open page" />
    <span class="schedule {schedules[event.event]}">
      {schedules[event.event]}
    </span>
  </div>
</div>

<style>
  .alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .details {
    min-width: 0;
  }
  .title {
    overflow-wrap: anywhere;
    font-size: var(--font-sm);
    font-weight: 600;
  }
  .site {
    margin: 0;
    font-size: var(--font-sm);
    color: var(--gray-4);
    overflow-wrap: anywhere;
  }

  .actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .schedule {
    font-size: var(--font-sm);
    color: var(--gray-4);
    text-transform: capitalize;
  }

  .schedule.disabled {
    opacity: 0.7;
  }
</style>
