<script lang="ts">
  import Loader from "@lucide/svelte/icons/loader";

  interface Props {
    // The status text shown next to the spinner, e.g. "Signing you in…".
    message: string;
  }

  let { message }: Props = $props();
</script>

<p class="loading">
  <span class="spinner"><Loader size={20} /></span>
  <span class="label">{message}</span>
</p>

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    margin: 0;
    font-weight: 700;
    color: var(--red-3);
    cursor: default;
  }

  /* Faded so the icon reads as a subtle in-progress hint next to the bolder
     label. Wrapping span carries the spin so the SVG inherits currentColor. */
  .spinner {
    display: inline-flex;
    opacity: 0.5;
    animation: spin 5s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
