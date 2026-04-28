<script lang="ts">
  import { authState, login, logout } from '../auth.svelte.ts'
  import { ArrowRight } from "@lucide/svelte";
  import { getRouter } from "../components/Router.svelte";

  interface Props {
    selector: string;
    matchText: string;
    url: string;
  }

  let { selector, matchText, url }: Props = $props();

  const router = getRouter();
</script>

<div class="container">
  <div class="section">
    <div class="auth">
      {#if authState.status === "authenticated"}
        <div class="user">
          Signed in as
          <strong>
            {authState.user?.preferred_username ??
              authState.user?.name ??
              authState.user?.email ??
              "Squarelet user"}
          </strong>
        </div>
        <button class="link" onclick={() => logout()}>Sign out</button>
      {:else}
        <button
          class="primary"
          disabled={authState.status === "authenticating"}
          onclick={() => login()}
        >
          {authState.status === "authenticating"
            ? "Signing in…"
            : "Sign in with MuckRock"}
        </button>
        {#if authState.error}
          <p class="error">{authState.error}</p>
        {/if}
      {/if}
    </div>

    <label>
      Page URL
      <input type="text" readonly value={url} />
    </label>

    <label>
      CSS Selector
      <input type="text" readonly value={selector} />
    </label>

    {#if matchText}
      <div class="match-text">
        <strong>Matched text:</strong>
        <p>{matchText}</p>
      </div>
    {/if}

    <p class="hint">Click an element or drag to select a region.</p>
  </div>
  <footer class="button-row">
    <button class="btn-primary" onclick={() => router.navigate("createAlert")}>
      Create alert
      <ArrowRight />
    </button>
  </footer>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .section {
    padding: 1em;
    flex: 1 1 auto;
  }
  label {
    display: block;
    margin-bottom: 12px;
    font-weight: 500;
    font-size: 12px;
    color: #666;
  }

  input {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    font-family: monospace;
    background: #f9f9f9;
    box-sizing: border-box;
  }

  .match-text {
    margin-bottom: 12px;
  }

  .match-text strong {
    font-size: 12px;
    color: #666;
  }

  .match-text p {
    margin: 4px 0 0;
    padding: 8px;
    background: #f0f7ff;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.4;
    max-height: 200px;
    overflow-y: auto;
  }

  .hint {
    color: #999;
    font-size: 12px;
    font-style: italic;
  }

  .auth {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .auth .user {
    font-size: 13px;
    color: #333;
    margin-bottom: 6px;
  }

  .auth button.primary {
    width: 100%;
    padding: 8px 12px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .auth button.primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .auth button.link {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
  }

  .auth .error {
    color: #b91c1c;
    font-size: 12px;
    margin: 6px 0 0;
  }
</style>
