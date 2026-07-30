<script lang="ts">
  import type { PageProps } from "./$types";
  import { enhance } from "$app/forms";
  import { schedules } from "@klaxon/lib/api";
  import { getSiteLabel, isWholePage } from "@klaxon/lib/utils";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";

  import ExtensionGuidance from "$lib/components/ExtensionGuidance.svelte";

  let { data, form }: PageProps = $props();

  const alert = $derived(data.alert);
  const label = $derived(getSiteLabel(alert) ?? "Alert");
  const wholePage = $derived(isWholePage(alert.parameters.selector));

  // Seed each field from the alert, but prefer what the last failed submit sent
  // back so a validation error doesn't discard the user's edits.
  const schedule = $derived(
    form?.values?.schedule ?? schedules[alert.event] ?? "weekly",
  );
  const title = $derived(form?.values?.title ?? alert.parameters.title ?? "");
  const slackWebhook = $derived(
    form?.values?.slack_webhook ?? alert.parameters.slack_webhook ?? "",
  );

  const errors = $derived(form?.errors ?? {});

  let saving = $state(false);
</script>

<svelte:head>
  <title>Edit {label} | Klaxon Cloud</title>
</svelte:head>

<div class="edit-page">
  <a class="back" href="/alerts/{alert.id}/">
    <ArrowLeft size={16} />
    {label}
  </a>

  <header class="head">
    <h1>Edit alert</h1>
    <p class="site">{alert.parameters.site}</p>
  </header>

  <form
    method="POST"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => {
        await update();
        saving = false;
      };
    }}
  >
    {#if form?.message}
      <p class="form-error" role="alert">{form.message}</p>
    {/if}

    <!-- What's being watched isn't editable here: the selector comes from the
         extension's picker. State it, and let ExtensionGuidance explain the
         hand-off below. -->
    <p class="watching">
      This alert is watching <strong>
        {wholePage ? "the entire page" : "part of the page"}
      </strong> for changes.
    </p>

    <div class="field">
      <label class="field-label" for="schedule">
        How often should Klaxon check this page?
      </label>
      <select id="schedule" name="schedule" value={schedule}>
        <option value="hourly">Hourly</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="disabled">Disabled</option>
      </select>
      {#if schedule === "disabled"}
        <p class="field-hint">
          This alert is currently disabled. Pick a frequency to start checking
          again.
        </p>
      {/if}
      {#if errors.schedule}
        <p class="field-error">{errors.schedule.join(" ")}</p>
      {/if}
    </div>

    <div class="field">
      <div class="field-header">
        <label class="field-label" for="alert-name">
          Name this alert (optional):
        </label>
        <p class="field-hint">
          Give this alert a custom name. (By default, we'll use the title of the
          watched webpage.)
        </p>
      </div>
      <input
        id="alert-name"
        type="text"
        placeholder="Title"
        name="title"
        value={title}
      />
      {#if errors.title}
        <p class="field-error">{errors.title.join(" ")}</p>
      {/if}
    </div>

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
        value={slackWebhook}
      />
      {#if errors.slack_webhook}
        <p class="field-error">{errors.slack_webhook.join(" ")}</p>
      {/if}
    </div>

    <div class="button-row">
      <button class="btn-primary" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Update alert"}
      </button>
      <a class="cancel" href="/alerts/{alert.id}/">Cancel</a>
    </div>
  </form>

  <ExtensionGuidance context="edit" site={alert.parameters.site} />
</div>

<style>
  .edit-page {
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

  h1 {
    margin: 0;
    font-size: var(--font-xl);
    font-weight: 700;
  }

  .site {
    margin: 0.25rem 0 0;
    font-size: var(--font-sm);
    color: var(--gray-4);
    overflow-wrap: anywhere;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 32rem;
  }

  .watching {
    margin: 0;
    line-height: 1.4;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-label {
    font-size: var(--font-sm);
    font-weight: 700;
    line-height: 1.4;
  }

  .field-hint {
    margin: 0;
    font-size: var(--font-sm);
    line-height: 1.4;
    color: var(--gray-4);
  }

  .field-error,
  .form-error {
    margin: 0;
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--red-4);
  }

  select,
  input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--gray-3);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-family: inherit;
    font-size: var(--font-md);
    background: var(--white);
  }

  .button-row {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .cancel {
    font-size: var(--font-sm);
    font-weight: 600;
    text-decoration: none;
  }

  .cancel:hover {
    text-decoration: underline;
  }
</style>
