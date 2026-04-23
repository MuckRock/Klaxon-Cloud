<script lang="ts">
  import { getRouter } from "../components/Router.svelte";

  interface Props {
    selector: string | null;
    matchText: string | null;
    url: string;
  }

  let { selector, matchText, url }: Props = $props();

  const router = getRouter();

  let frequency = $state("weekly");
  let name = $state("");
  let slackWebhook = $state("");

  function handleSave() {
    console.log("TODO: save alert", {
      url,
      selector,
      matchText,
      frequency,
      name,
      slackWebhook,
    });
    router.navigate('home');
  }
</script>

<div class="container save-alert">
  <header>
    <button class="back-link" onclick={() => router.navigate("createAlert")}>
      &#8249; <span>Back</span>
    </button>
  </header>
  <main class="section content">
    <div class="intro">
      <h3>Save alert</h3>
      <p class="description">
        This alert will watch <strong
          >{selector ? "part of the page" : "the entire page"}</strong
        > for changes.
      </p>
      <p class="description">
        We just need a bit more info to save your alert.
      </p>
    </div>

    <div class="field">
      <label class="field-label" for="frequency"
        >How often should Klaxon check this page?</label
      >
      <div class="select-wrapper">
        <select id="frequency" bind:value={frequency}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    </div>

    <div class="field">
      <div class="field-header">
        <label class="field-label" for="alert-name"
          >Name this alert (optional):</label
        >
        <p class="field-hint">
          Give this alert a custom name. (By default, we'll use the title of
          this webpage.)
        </p>
      </div>
      <input
        id="alert-name"
        type="text"
        placeholder={document.title}
        bind:value={name}
      />
    </div>

    <div class="field">
      <div class="field-header">
        <label class="field-label" for="slack-webhook"
          >Slack Webhook (optional):</label
        >
        <p class="field-hint">
          Enter a <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer">Slack Webhook URL</a
          > to enable Slack notifications.
        </p>
      </div>
      <input
        id="slack-webhook"
        type="url"
        bind:value={slackWebhook}
      />
    </div>
  </main>
  <footer class="button-row">
    <button class="btn-primary" onclick={handleSave}>Save alert</button>
  </footer>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  header, main, footer {
    padding: 1em;
  }

  main {
    flex: 1 1 auto;
  }

  .back-link {
    background: none;
    border: none;
    color: #c41a4d;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    text-align: left;
  }

  .back-link span {
    text-decoration: underline;
  }

  .back-link:hover {
    opacity: 0.8;
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
    font-size: 20px;
    font-weight: 700;
    color: #0c1e27;
  }

  .description {
    margin: 0;
    font-size: 16px;
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
    font-size: 14px;
    font-weight: 700;
    color: #000;
    line-height: 1.4;
  }

  .field-hint {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    color: #0c1e27;
  }

  .field-hint a {
    color: #c41a4d;
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
    font-size: 14px;
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
    font-size: 16px;
    font-family: inherit;
    color: #233944;
    background: white;
    box-sizing: border-box;
    box-shadow: inset 0px 2px 0px 0px #d8dee2;
  }

  input::placeholder {
    color: #99a8b3;
  }

  .button-row {
    display: flex;
    justify-content: flex-end;
    position: sticky;
    bottom: 0;
    background: #fff;
    margin-top: 1em;
    padding: 1em;
    border-top: 1px solid #ccc;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
    background: #ec7b6b;
    color: #f5f6f7;
    border: 1px solid #69515c;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 1.125em;
    font-weight: 600;
    cursor: pointer;
    line-height: 1.4;
    width: 100%;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }
</style>
