<script lang="ts">
  import type { PageProps } from "./$types";
  import { browser } from "$app/environment";
  import { enhance } from "$app/forms";
  import { schedules } from "@klaxon/lib/api";
  import { getSiteLabel, isWholePage } from "@klaxon/lib/utils";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Code from "@lucide/svelte/icons/code";

  import ExtensionGuidance from "$lib/components/ExtensionGuidance.svelte";

  let { data, form }: PageProps = $props();

  const alert = $derived(data.alert);
  const label = $derived(getSiteLabel(alert) ?? "Alert");

  // Seed each field from the alert, but prefer what the last failed submit sent
  // back so a validation error doesn't discard the user's edits.
  const schedule = $derived(form?.values?.schedule ?? schedules[alert.event] ?? "weekly");
  const site = $derived(form?.values?.site ?? alert.parameters.site ?? "");
  const title = $derived(form?.values?.title ?? alert.parameters.title ?? "");
  const slackWebhook = $derived(
    form?.values?.slack_webhook ?? alert.parameters.slack_webhook ?? "",
  );

  // The selector is the one field read back while typing — it drives the
  // "watching…" sentence and its own syntax check — so it tracks what's in the
  // textarea. `null` means untouched, leaving the seeding above to it.
  let typed = $state<string | null>(null);
  const selector = $derived(typed ?? form?.values?.selector ?? alert.parameters.selector ?? "");
  const wholePage = $derived(isWholePage(selector));

  // Only a syntax check: whether the selector matches anything can't be known
  // here, since the watched page isn't loaded. The extension's picker resolves
  // it against the live DOM instead, which is why it can say more than this.
  const selectorError = $derived.by(() => {
    if (!browser || wholePage) return "";
    try {
      document.querySelector(selector);
      return "";
    } catch {
      return "Invalid CSS selector.";
    }
  });

  const errors = $derived(form?.errors ?? {});

  let saving = $state(false);
  let selectorOpen = $state(false);

  // A rejected selector would otherwise report itself inside a collapsed panel.
  $effect(() => {
    if (errors.selector) selectorOpen = true;
  });
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

    <!-- The form's two halves: what the alert points at, and how it behaves once
         it runs. They sit side by side as soon as both columns fit. -->
    <div class="groups">
      <fieldset class="group">
        <legend class="group-title">Page & selection</legend>

        <div class="group-body">
          <!-- Reads the selector field below, so it follows a hand-edit as it's
               typed — including to and from "the entire page" when cleared. -->
          <p class="watching">
            This alert is watching <strong>
              {wholePage ? "the entire page" : "part of the page"}
            </strong> for changes.
          </p>

          <div class="field">
            <div class="field-header">
              <label class="field-label" for="site"> Which page should we watch? </label>
              {#if !wholePage}
                <p class="field-hint">
                  The watched region was picked on the current page, so pointing this alert
                  somewhere else may leave nothing for it to match.
                </p>
              {/if}
            </div>
            <input
              id="site"
              type="url"
              inputmode="url"
              placeholder="https://example.com/page"
              name="site"
              value={site}
              required
            />
            {#if errors.site}
              <p class="field-error">{errors.site.join(" ")}</p>
            {/if}
          </div>

          <ExtensionGuidance context="edit" site={alert.parameters.site} />

          <!-- The selector is normally the picker's business, so it stays folded
               away — same status-row-plus-disclosure shape as the guidance. -->
          <section class="selector-panel">
            <div class="row">
              <span class="icon" aria-hidden="true">
                <Code size={18} />
              </span>

              <p class="status">Familiar with CSS?</p>

              <button
                type="button"
                class="more"
                aria-expanded={selectorOpen}
                aria-controls="selector-details"
                onclick={() => (selectorOpen = !selectorOpen)}
              >
                Customize the selector
                <span class="chevron" class:up={selectorOpen} aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>
            </div>

            <div class="details" id="selector-details" hidden={!selectorOpen}>
              <label class="field-label" for="selector">CSS selector</label>
              <p class="field-hint" id="selector-hint">
                Klaxon watches whatever this selector matches; leave it empty to watch the whole
                page.
              </p>
              <textarea
                id="selector"
                name="selector"
                class="selector-input"
                rows="4"
                spellcheck="false"
                aria-describedby="selector-hint"
                value={selector}
                oninput={(e) => (typed = e.currentTarget.value)}></textarea>
              {#if selectorError}
                <p class="field-error">{selectorError}</p>
              {/if}
              {#if errors.selector}
                <p class="field-error">{errors.selector.join(" ")}</p>
              {/if}
            </div>
          </section>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend class="group-title">Alert settings</legend>

        <div class="group-body">
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
                This alert is currently disabled. Pick a frequency to start checking again.
              </p>
            {/if}
            {#if errors.schedule}
              <p class="field-error">{errors.schedule.join(" ")}</p>
            {/if}
          </div>

          <div class="field">
            <div class="field-header">
              <label class="field-label" for="alert-name"> Name this alert (optional): </label>
              <p class="field-hint">
                Give this alert a custom name. (By default, we'll use the title of the watched
                webpage.)
              </p>
            </div>
            <input id="alert-name" type="text" placeholder="Title" name="title" value={title} />
            {#if errors.title}
              <p class="field-error">{errors.title.join(" ")}</p>
            {/if}
          </div>

          <div class="field">
            <div class="field-header">
              <label class="field-label" for="slack-webhook"> Slack Webhook (optional): </label>
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
        </div>
      </fieldset>
    </div>

    <div class="button-row">
      <button class="btn-primary" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Update alert"}
      </button>
      <a class="cancel" href="/alerts/{alert.id}/">Cancel</a>
    </div>
  </form>
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

  form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* One column per group once two of them fit; each group keeps a comfortable
     measure, so a wide viewport widens the gutter rather than the fields. */
  .groups {
    display: grid;
    align-items: start;
    gap: 2rem;
    grid-template-columns: minmax(0, 1fr);
  }

  @media (min-width: 60rem) {
    .groups {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 3rem;
    }
  }

  /* Reset the fieldset chrome; the legend does the grouping work on its own. */
  .group {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .group-title {
    width: 100%;
    padding: 0 0 0.5rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid var(--gray-2);
    font-size: var(--font-lg);
    font-weight: 700;
    line-height: 1.3;
  }

  /* The fields live in their own box rather than directly in the fieldset,
     since a legend inside a flex container lays out inconsistently. */
  .group-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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

  /* Folded-away advanced field, so it reads as an aside rather than as another
     step in the form. */
  .selector-panel {
    border: 1px solid var(--blue-2);
    border-radius: var(--klaxon-border-radius);
    background: var(--blue-1);
    padding: 0.75rem 1rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 1rem;
    /* The status text takes the slack, so the trigger sits at the far edge until
       the row is too narrow and the button drops below. */
    flex-wrap: wrap;
  }

  .icon {
    align-self: flex-start;
    margin-top: 0.05em;
    display: inline-flex;
    flex: none;
    color: var(--blue-4);
  }

  .status {
    flex: 1 1 8rem;
    margin: 0;
    font-weight: 600;
    line-height: 1.3;
  }

  .more {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--klaxon-color-link);
    cursor: pointer;
  }

  .more:hover {
    text-decoration: underline;
  }

  .chevron {
    display: inline-flex;
    transition: transform 150ms ease;
  }

  .chevron.up {
    transform: rotate(180deg);
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--blue-2);
  }

  .details[hidden] {
    display: none;
  }

  .selector-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--blue-2);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-family: monospace;
    font-size: var(--font-sm);
    line-height: 1.4;
    background: var(--white);
    resize: vertical;
    word-break: break-all;
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
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
