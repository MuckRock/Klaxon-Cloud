<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";

  import type { Event, Page } from "../types";

  import Link from "../components/Link.svelte";
  import RelativeTime from "../components/RelativeTime.svelte";
  import { scheduled, schedules, update } from "../api";
  import { authState } from "../auth.svelte";
  import { getRouter } from "../router.svelte";
  import { getToaster } from "../toaster.svelte";
  import { getCanonicalURL } from "../url";
  import { emptyPage, getSiteLabel } from "../utils";

  const router = getRouter();
  const toaster = getToaster();

  // This view owns its own data instead of receiving it via router props.
  // The effect fetches on mount and re-runs whenever auth flips to
  // authenticated (boot + re-login), with cancellation on unmount/re-run.
  let events = $state<Page<Event>>(emptyPage<Event>());

  $effect(() => {
    if (authState.status !== "authenticated") return;

    let cancelled = false;

    scheduled({ site: getCanonicalURL() }).then((res) => {
      if (cancelled) return;

      // The API surfaces failures as a `.error` field rather than throwing.
      // Leave any already-loaded data in place rather than blanking it out.
      if (res.error) {
        console.error("Failed to load alerts:", res.error);
        toaster.error("Something went wrong loading your alerts.");
        return;
      }

      events = res.data ?? emptyPage<Event>();
    });

    return () => {
      cancelled = true;
    };
  });

  let loading: boolean = $state(false);
  let selected: Event[] = $state([]);

  let message: string = $derived.by(() => {
    if (selected.length === 0) {
      return "Select alerts to disable";
    } else if (selected.length === 1) {
      return "Disable 1 alert";
    } else {
      return `Disable ${selected.length} alerts`;
    }
  });

  async function disable(toDisable: Event[]) {
    loading = true;
    const promises = toDisable.map((event) =>
      update(event.id, "disabled", event.parameters),
    );

    const results = await Promise.all(promises);

    // Write each updated event back into the rendered list.
    results.forEach(({ data }) => {
      if (data) {
        const index = events.results.findIndex((e) => e.id === data.id);
        if (index !== -1) {
          events.results[index] = data;
        }
      }
    });

    const failures = results.filter((r) => r.error);
    if (failures.length > 0) {
      console.error(
        "Disable alert(s) failed:",
        failures.map((f) => f.error),
      );
      toaster.error(
        failures.length === 1
          ? (failures[0].error?.message ?? "Failed to disable 1 alert.")
          : `Failed to disable ${failures.length} of ${toDisable.length} alerts.`,
      );
    } else {
      toaster.success(
        toDisable.length === 1
          ? "Alert disabled."
          : `${toDisable.length} alerts disabled.`,
      );
    }

    loading = false;
    // Keep any failed alerts selected so the user can retry.
    selected = toDisable.filter((_, i) => results[i].error);
  }
</script>

<div class="container list-alerts">
  <main class="section">
    <h3>Your alerts</h3>

    <button
      type="button"
      class="disable"
      disabled={selected.length === 0 || loading}
      onclick={() => disable(selected)}
    >
      {message}
    </button>

    <div class="alerts">
      {#each events.results as event (event.id)}
        <div class="event">
          <div class="header">
            <input type="checkbox" value={event} bind:group={selected} />
            <h4><Link view="viewAlert" {event}>{getSiteLabel(event)}</Link></h4>
          </div>
          <div class="body">
            <dl>
              <dt>Created</dt>
              <dd>
                <RelativeTime date={new Date(event.created_at)} />
              </dd>
              <dt>Alert status</dt>
              <dd>{schedules[event.event]}</dd>
            </dl>
          </div>
        </div>
      {/each}
    </div>
  </main>

  <footer class="button-row">
    <button class="btn-primary" onclick={() => router.navigate("createAlert")}>
      Create a new alert
      <ArrowRight />
    </button>
  </footer>
</div>

<style>
  .container {
    display: flex;
    padding: var(--font-md, 16px) 0.75rem;
    flex-direction: column;
    gap: var(--font-lg, 20px);
    border-bottom: 1px solid var(--orange-2, #ffc2ba);
  }

  main,
  footer {
    padding: 1em;
  }

  main {
    flex: 1 1 auto;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: 1em;
    flex: 1 1 auto;
  }

  button.disable {
    display: flex;
    padding: 0.25rem 0.625rem;
    justify-content: center;
    align-items: center;
    gap: 0.375rem;
    border-radius: 0.5rem;
    border: 1px solid var(--orange-4, #69515c);
    background: var(--orange-3, #ec7b6b);

    color: var(--gray-1, #f5f6f7);
    text-align: center;
    cursor: pointer;

    /* Small Label */
    font-family: var(--font-sans, "Source Sans Pro");
    font-size: var(--font-sm, 14px);
    font-style: normal;
    font-weight: 600;
    line-height: normal;
  }

  button.disable:disabled {
    opacity: 0.5;
  }

  .alerts {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;
    border-radius: var(--klaxon-border-radius, 0.5rem);
    border: 1px solid var(--gray-2, #d8dee2);
    background: #fffefa;
  }

  .event {
    display: flex;
    padding: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    align-self: stretch;

    border-bottom: 1px solid var(--gray-2, #d8dee2);

    .header {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      align-self: stretch;

      input[type="checkbox"] {
        display: flex;
        padding-top: 0.25rem;
        align-items: flex-start;
        gap: 0.625rem;
        align-self: stretch;
      }

      h4 {
        flex: 1 0 0;
        min-width: 0;
        overflow-wrap: anywhere;

        /* Clamp long URLs/titles to two lines, then ellipsis. */
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;

        color: var(--klaxon-color-link, #c41a4d);
        font-size: var(--font-md, 16px);
        font-style: normal;
        font-weight: 700;
        line-height: 130%; /* 1.3rem */
      }
    }

    .body {
      display: flex;
      padding-left: 2.125rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.375rem;
      align-self: stretch;

      dl {
        display: grid;
        grid-template-columns: auto 1fr;
        align-self: stretch;
        column-gap: 0.5rem;
        row-gap: 0.375rem;
        margin: 0;
      }

      dt {
        font-weight: bold;
      }

      dt::after {
        content: ":";
      }

      dd {
        margin: 0;
      }
    }
  }
</style>
