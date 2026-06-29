<script lang="ts">
  import type { AddOnSchedule, KlaxonParams } from "@klaxon/lib/types";

  import { authState } from "../auth.svelte.ts";
  import { dispatch } from "../api";
  import { getCanvas } from "../canvas-client.svelte";
  import { getRouter } from "../router.svelte";
  import { getToaster } from "../toaster.svelte";
  import { completeSave, reportSaveError } from "../save";
  import SignInPrompt from "../components/SignInPrompt.svelte";

  interface Props {
    schedule: AddOnSchedule;
    params: KlaxonParams;
  }

  let { schedule, params }: Props = $props();

  const canvas = getCanvas();
  const router = getRouter();
  const toaster = getToaster();

  // Non-reactive guard: a fresh SignIn instance mounts per navigation, so this
  // resets correctly each time. Deliberately NOT $state — flipping it must not
  // re-trigger the effect, or the deferred save would dispatch twice.
  let fired = false;

  // Once the user returns from the OIDC flow authenticated, finish the save
  // they kicked off. Read auth status synchronously; dispatch is async, so we
  // must not re-read reactive auth state after the await.
  $effect(() => {
    if (authState.status !== "authenticated" || fired) return;
    fired = true;
    save();
  });

  async function save() {
    const result = await dispatch(schedule, params);
    if (result.error) {
      reportSaveError(toaster, result.error);
      // Return to the form with the user's entries re-populated.
      router.back();
      return;
    }
    completeSave({ canvas, toaster, router });
  }
</script>

<div class="container">
  <div class="intro">
    <h3>Sign in to save your alert</h3>
    <p class="description">
      You're almost there. Sign in or create a free MuckRock account, and we'll
      finish saving this alert as soon as you're back.
    </p>
  </div>
  <SignInPrompt />
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 1em;
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
</style>
