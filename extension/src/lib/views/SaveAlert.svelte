<script lang="ts">
  import type {
    AddOnSchedule,
    APIResponse,
    Event,
    KlaxonParams,
    ValidationError,
  } from "@klaxon/lib/types";

  import { untrack } from "svelte";

  import PinnedTabNotice from "../components/PinnedTabNotice.svelte";
  import { authState } from "../auth.svelte.ts";
  import { getCanvas } from "../canvas-client.svelte";
  import { getRouter } from "../router.svelte";
  import { getToaster } from "../toaster.svelte";
  import { dispatch } from "../api";
  import { completeSave, reportSaveError } from "../save";
  import { WHOLE_PAGE_SELECTOR } from "@klaxon/lib/utils";

  interface Props {
    // Seed values, carried back from the sign-in interstitial OR restored from a
    // per-tab snapshot, so the form re-populates the user's entries.
    schedule?: AddOnSchedule;
    title?: string;
    slackWebhook?: string;
    url?: string;
  }

  const props: Props = $props();

  const router = getRouter();
  const toaster = getToaster();
  const canvas = getCanvas();

  // Local form state, seeded once from props (carried back from the sign-in
  // interstitial via the navigate `restore` option). Plain $state so it's
  // decoupled from later props churn.
  let frequency = $state<AddOnSchedule>(
    untrack(() => props.schedule) ?? "weekly",
  );
  let title = $state(untrack(() => props.title) ?? "");
  let slackWebhook = $state(untrack(() => props.slackWebhook) ?? "");
  let url = $state(untrack(() => props.url) ?? "");
  let saving = $state(false);

  // The page URL/title now resolve asynchronously over the port (the panel can't
  // read the page DOM directly). Fill the URL in once it arrives, unless we were
  // seeded with one; the title backs the placeholder and the save-time fallback.
  $effect(() => {
    if (!url && canvas.url) url = canvas.url;
  });
  const defaultTitle = $derived(canvas.title);

  let locked = $derived(canvas.state.locked);
  let selector = $derived(canvas.state.selector);

  async function handleSave() {
    const params: KlaxonParams = {
      // Fall back to the page title when the user leaves the field blank, so the
      // saved alert matches the placeholder shown in the form.
      title: title.trim() || defaultTitle,
      slack_webhook: slackWebhook.trim() || undefined,
      site: url,
      // Only a *locked* selection is a real choice. An unlocked canvas (or one
      // with no real selector) means "watch the whole page", saved as "*" — the
      // value the Add-On's `soup.select("*")` expects. Without this guard the
      // canvas's live hover preview would also leak in as an arbitrary selector.
      selector: locked && selector ? selector : WHOLE_PAGE_SELECTOR,
    };

    // Signed-out users can fill out the form, but the save needs a token. Route
    // them through the sign-in interstitial, carrying the dispatch args forward
    // and the form values back so nothing they typed is lost.
    if (authState.status !== "authenticated") {
      router.navigate(
        "signIn",
        { schedule: frequency, params },
        { restore: { schedule: frequency, title, slackWebhook, url } },
      );
      return;
    }

    saving = true;

    const result: APIResponse<Event, ValidationError> = await dispatch(
      frequency,
      params,
    );

    saving = false;

    if (result.error) {
      reportSaveError(toaster, result.error);
      return;
    }

    completeSave({ canvas, toaster, router });
  }
</script>

<form
  class="container save-alert"
  onsubmit={(e) => {
    e.preventDefault();
    handleSave();
  }}
>
  <main class="section content">
    <div class="intro">
      <h3>Save alert</h3>
      <p class="description">
        This alert will watch <strong>
          {locked ? "part of the page" : "the entire page"}
        </strong> for changes.
      </p>
      <p class="description">
        We just need a bit more info to save your alert.
      </p>
    </div>

    <!-- url -->
    <div class="field">
      <div class="field-header">
        <label for="alert-url" class="field-label"> URL </label>
        <p class="field-hint">
          Check that this URL is correct. A mismatch could make this alert
          harder to find later, or cause changes to be missed.
        </p>
      </div>
      <input type="url" name="url" id="alert-url" bind:value={url} />
    </div>

    <!-- schedule -->
    <div class="field">
      <label class="field-label" for="frequency">
        How often should Klaxon check this page?
      </label>
      <div class="select-wrapper">
        <select id="frequency" bind:value={frequency} name="schedule">
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
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
        placeholder={defaultTitle || "Title"}
        name="title"
        bind:value={title}
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
        bind:value={slackWebhook}
      />
    </div>
  </main>
  <footer class="button-row">
    <button class="btn-primary" type="submit" disabled={saving}>
      {saving ? "Saving…" : "Save alert"}
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
