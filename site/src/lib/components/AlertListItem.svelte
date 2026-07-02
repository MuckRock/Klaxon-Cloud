<script lang="ts">
  import { schedules } from "@klaxon/lib/api";
  import type { Event } from "@klaxon/lib/types";
  import { getSiteLabel, getSite } from "@klaxon/lib/utils";

  interface Props {
    event: Event;
  }

  let { event }: Props = $props();
</script>

<div class="alert">
  <div class="details">
    <a
      class="title"
      href={event.parameters.site}
      target="_blank"
      rel="noopener noreferrer"
    >
      {getSiteLabel(event)}
    </a>
    {#if event.parameters.title}
      <p class="site">
        {getSite(event)}
      </p>
    {/if}
  </div>
  <span class="schedule {schedules[event.event]}">
    {schedules[event.event]}
  </span>
</div>

<style>
  .alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .title {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: var(--font-sm);
    font-weight: 600;
  }
  .site {
    margin: 0;
    font-size: var(--font-sm);
    color: var(--gray-4);
  }

  .schedule {
    flex: none;
    font-size: var(--font-sm);
    color: var(--gray-4);
    text-transform: capitalize;
  }

  .schedule.disabled {
    opacity: 0.7;
  }
</style>
