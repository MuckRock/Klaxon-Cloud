<script lang="ts">
  import type { APIResponse, Event, ValidationError } from "../types";
  import { onMount } from "svelte";

  import SelectionPicker from "../components/SelectionPicker.svelte";
  import { getRouter, type View } from "../router.svelte";
  import { getToaster } from "../toaster.svelte";
  import { schedules, update } from "../api";
  import { getCanvas } from "../canvas.svelte";

  interface Props {
    event: Event;
    /** Which view to return to after saving or going back (defaults to editAlert). */
    origin?: View;
    matchText: string;
  }

  let { event, origin = "editAlert" }: Props = $props();

  const router = getRouter();
  const canvas = getCanvas();
  const toaster = getToaster();

  let saving = $state(false);
  let locked = $derived(canvas.state.locked);
  let selector = $derived(canvas.state.selector);

  // Pre-load this alert's existing selection into the canvas once, so the user
  // sees and tweaks it rather than starting from scratch. Cleared on unmount.
  onMount(() => {
    if (event.parameters.selector) {
      const el = canvas.setSelector(event.parameters.selector);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return () => canvas.clearSelection();
  });

  async function handleSave() {
    saving = true;

    // Only a *locked* selection is a real choice. An unlocked canvas means
    // "watch the whole page" — without this guard the canvas's live hover
    // preview would leak in as an arbitrary selector.
    const params = { ...event.parameters, selector: locked ? selector : "" };
    const frequency = schedules[event.event] ?? "weekly";

    const result: APIResponse<Event, ValidationError> = await update(
      event.id,
      frequency,
      params,
    );

    saving = false;

    if (result.error) {
      console.error("Save selection failed:", result.error);
      toaster.error(result.error.message ?? "Failed to save selection.");
      return;
    }

    toaster.success("Selection saved.");
    // Return to where we came from, showing the saved alert. Use replace so the
    // editor isn't left on the back stack — Back from the origin should go to
    // wherever the origin came from, not back into the editor.
    router.replace(origin, {
      event: result.data ?? { ...event, parameters: params },
    });
  }
</script>

<div class="container edit-selection">
  <main class="section">
    <h3>Edit selection</h3>
    <p class="description">
      Adjust which <strong>part of the page</strong> this alert watches for changes.
      Clear the selection to watch the entire page.
    </p>

    <SelectionPicker />
  </main>

  <footer class="button-row">
    <button
      class="btn-primary"
      type="button"
      onclick={handleSave}
      disabled={saving}
    >
      {saving ? "Saving…" : "Save selection"}
    </button>
  </footer>
</div>

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

  .section {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: 1em;
    flex: 1 1 auto;
  }

  h3 {
    margin: 0;
    font-size: var(--font-lg, 20px);
    font-weight: 600;
    color: #000;
    line-height: 1.2;
  }

  .description {
    margin: 0;
    font-size: var(--font-sm, 14px);
    line-height: 1.4;
    color: #000;
  }
</style>
