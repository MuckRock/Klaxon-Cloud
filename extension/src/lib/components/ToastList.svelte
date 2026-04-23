<script lang="ts">
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { CircleAlert, CircleCheck, X } from "@lucide/svelte";
  import { getToaster } from "./Toaster.svelte";

  const toaster = getToaster();
</script>

<div class="toast-list">
  {#each toaster.toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      role="alert"
      animate:flip={{ duration: 200 }}
      transition:slide={{ duration: 200 }}
    >
      <span class="toast-icon">
        {#if toast.type === "success"}
          <CircleCheck size={20} strokeWidth={2} />
        {:else}
          <CircleAlert size={20} strokeWidth={2} />
        {/if}
      </span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-dismiss"
        onclick={() => toaster.dismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-list {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0;
    width: 100%;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 8px 16px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 16px;
    line-height: 1.25;
    color: #0c1e27;
  }

  .toast-success {
    background: #ebf9f6;
    border: 1px solid #27c6a2;
  }

  .toast-error {
    background: #fff0ee;
    border: 1px solid #ec7b6b;
  }

  .toast-icon {
    display: block;
    flex: 0 0 auto;
  }

  .toast-success .toast-icon {
    color: #117383;
  }

  .toast-error .toast-icon {
    color: #e1275f;
  }

  .toast-message {
    flex: 1;
  }

  .toast-dismiss {
    flex: 0 0 auto;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: #0c1e27;
    opacity: 0.6;
    line-height: 1;
  }

  .toast-dismiss:hover {
    opacity: 1;
  }
</style>
