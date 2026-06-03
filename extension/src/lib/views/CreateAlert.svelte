<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  
  import SelectionPicker from "../components/SelectionPicker.svelte";

  import { getRouter } from "../router.svelte";

  const router = getRouter();
</script>

<div class="container create-alert">
  <main class="section">
    <h3>Create an alert</h3>
    <p class="description">
      By default, Klaxon watches the entire page for changes. If that sounds
      good, you can proceed to the next step.
    </p>
    <p class="description">
      Or, Klaxon can watch <strong>part of the page</strong> for changes.
    </p>
    <p class="description">
      Once the selection looks right, you can proceed to the next step.
    </p>
    <SelectionPicker />
  </main>
  <footer class="button-row">
    <button class="btn-primary" onclick={() => router.navigate("saveAlert")}>
      Add alert details
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
