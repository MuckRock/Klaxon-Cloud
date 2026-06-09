<script lang="ts">
  import type {
    AddOnSchedule,
    APIResponse,
    Event,
    KlaxonParams,
    ValidationError,
  } from "../types";

  import { getCanvas } from "../canvas.svelte";
  import { getToaster } from "../toaster.svelte";
  import { getRouter } from "../router.svelte";
  import { eventValues, schedules, update } from "../api";

  interface Props {
    event: Event;
  }

  let { event }: Props = $props();

  let form: HTMLFormElement | undefined = $state();

  let selector = $derived(event.parameters.selector);

  const router = getRouter();
  const toaster = getToaster();
  const canvas = getCanvas();

  let frequency: AddOnSchedule = $derived(schedules[event.event] ?? "weekly");
  let saving = $state(false);

  $effect(() => {
    if (selector) canvas.setSelector(selector);
    return () => {
      canvas.clearSelection();
    };
  });

  async function handleSave() {
    saving = true;

    const fd = new FormData(form);
    const params: KlaxonParams = {
      ...event.parameters,
      title: fd.get("title") as string,
      slack_webhook: fd.get("slack_webhook") as string,
    };

    const result: APIResponse<Event, ValidationError> = await update(
      event.id,
      frequency,
      params,
    );

    saving = false;

    if (result.error) {
      console.error("Save alert failed:", result.error);
      toaster.error(result.error.message ?? "Failed to save alert.");
      return;
    }

    canvas.clearSelection();
    toaster.success("Alert saved successfully!");
    // Edit complete — dump history so Back can't return to the edit form.
    router.navigate("listChanges", undefined, { reset: true });
  }

  /**
   * Reactivate this alert without navigating
   */
  async function reactivate() {
    // optimistic update
    event.event = eventValues.weekly;
    const { data, error } = await update(event.id, "weekly", event.parameters);

    if (error) {
      console.error(error);
      toaster.error(error.message);
      event.event = eventValues.disabled; // revert
      return;
    }

    if (data) {
      event = data;
      toaster.success("Alert reactivated");
    }
  }
</script>

<form
  bind:this={form}
  class="container save-alert"
  onsubmit={(e) => {
    e.preventDefault();
    handleSave();
  }}
>
  <main class="section content">
    <div class="intro">
      <h3>Edit alert</h3>
      <p class="description">
        This alert is watching <strong>
          {selector ? "part of the page" : "the entire page"}
        </strong> for changes.
      </p>
      <button
        type="button"
        class="edit-selection-link"
        onclick={() =>
          router.navigate("editSelection", { event, origin: "editAlert" })}
      >
        Edit selection
      </button>
    </div>

    <!-- schedule -->
    <div class="field">
      {#if frequency === "disabled"}
        <p class="description">This alert is currently disabled.</p>
        <button type="button" class="reactivate" onclick={reactivate}>
          Reactivate
        </button>
      {:else}
        <label class="field-label" for="frequency">
          How often should Klaxon check this page?
        </label>
        <div class="select-wrapper">
          <select id="frequency" bind:value={frequency} name="schedule">
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      {/if}
    </div>

    <!-- title -->
    <div class="field">
      <div class="field-header">
        <label class="field-label" for="alert-name">
          Name this alert (optional):
        </label>
        <p class="field-hint">
          Give this alert a custom name. (By default, we'll use the title of
          this webpage.)
        </p>
      </div>
      <input
        id="alert-name"
        type="text"
        placeholder="Title"
        name="title"
        value={event.parameters.title ?? ""}
      />
    </div>

    <!-- slack webhook -->
    <div class="field">
      <div class="field-header">
        <label class="field-label" for="slack-webhook">
          Slack Webhook (optional):
        </label>
        <p class="field-hint">
          Enter a <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
          >
            Slack Webhook URL
          </a> to enable Slack notifications.
        </p>
      </div>
      <input
        id="slack-webhook"
        type="url"
        placeholder="Webhook URL"
        name="slack_webhook"
        value={event.parameters.slack_webhook ?? ""}
      />
    </div>
  </main>
  <footer class="button-row">
    <button class="btn-primary" type="submit" disabled={saving}>
      {saving ? "Saving…" : "Update alert"}
    </button>
  </footer>
</form>

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  main,
  footer {
    padding: 1em;
  }

  main {
    flex: 1 1 auto;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .intro {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h3 {
    margin: 0;
    font-size: var(--font-lg, 20px);
    font-weight: 700;
    color: #0c1e27;
  }

  .description {
    margin: 0;
    font-size: var(--font-md, 16px);
    line-height: 1.4;
    color: #0c1e27;
  }

  .edit-selection-link {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--klaxon-color-link, #c41a4d);
    font-size: var(--font-sm, 14px);
    font-weight: 700;
    text-decoration: underline;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .field-header {
    display: flex;
    flex-direction: column;
  }

  .field-label {
    font-size: var(--font-sm, 14px);
    font-weight: 700;
    color: #000;
    line-height: 1.4;
  }

  .field-hint {
    margin: 0;
    font-size: var(--font-sm, 14px);
    line-height: 1.4;
    color: #0c1e27;
  }

  .field-hint a {
    color: var(--klaxon-color-link, #c41a4d);
    font-weight: 700;
    text-decoration: underline;
  }

  .select-wrapper {
    position: relative;
  }

  button.reactivate {
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

  select {
    width: 100%;
    appearance: none;
    background: white;
    border: 1px solid #99a8b3;
    border-radius: 8px;
    padding: 6px 32px 6px 12px;
    font-size: var(--font-sm, 14px);
    color: #233944;
    font-family: inherit;
    box-shadow: 0px 2px 0px 0px #99a8b3;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23233944' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
  }

  input {
    width: 100%;
    border: 1px solid #99a8b3;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: var(--font-md, 16px);
    font-family: inherit;
    color: #233944;
    background: white;
    box-sizing: border-box;
    box-shadow: inset 0px 2px 0px 0px var(--gray-2, #d8dee2);
  }

  input::placeholder {
    color: #99a8b3;
  }
</style>
