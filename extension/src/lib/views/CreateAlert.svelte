<script lang="ts">
  import { ArrowRight, ChevronRight } from "@lucide/svelte";
  import { getRouter } from "../components/Router.svelte";

  interface Props {
    locked: boolean;
    selector: string;
    matchText: string;
    onselectorchange: (css: string) => Element | null;
    onclearselection: () => void;
  }

  let { locked, selector, matchText, onselectorchange, onclearselection }: Props = $props();

  let editedSelector = $state("");
  let selectorError = $state("");
  let selectorPanelOpen = $state(false);

  // Sync edited selector when the external selector changes (e.g. from clicking)
  $effect(() => {
    editedSelector = selector;
    selectorError = "";
  });

  function handleSelectorInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    editedSelector = value;

    if (!value.trim()) {
      selectorError = "";
      onclearselection();
      return;
    }

    try {
      const el = onselectorchange(value);
      selectorError = el ? "" : "No element found for this selector.";
    } catch {
      selectorError = "Invalid CSS selector.";
    }
  }

  const router = getRouter();
</script>

<div class="container create-alert">
  <header>
    <button class="back-link" onclick={() => { onclearselection(); router.navigate("home"); }}>
      &#8249; <span>Back</span>
    </button>
  </header>

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
    {#if locked}
      <div class="message-card green">
        <svg class="message-card-graphic" width="76" height="60" viewBox="0 0 76 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H63.1968C69.8242 0 75.1968 5.37258 75.1968 12V29.234C75.1968 35.8615 69.8242 41.234 63.1968 41.234H0V0Z" fill="#292929"/>
          <path d="M60.7693 17.7791L0.0247192 17.7791V23.7791L60.7693 23.7791C62.4261 23.7791 63.7693 22.4359 63.7693 20.7791C63.7693 19.1222 62.4261 17.7791 60.7693 17.7791Z" fill="#D9D9D9"/>
          <rect width="27.0281" height="41.2341" fill="url(#paint0_linear_533_1375)"/>
          <g filter="url(#filter0_d_533_1375)">
          <circle cx="37.5984" cy="20.617" r="7.25272" stroke="white" stroke-width="9" shape-rendering="crispEdges"/>
          </g>
          <path d="M46.186 55.3233L38.9666 26.5773C38.8382 25.6007 39.4843 25.7404 39.8234 25.9324C47.9461 30.4503 64.443 39.6358 65.4498 40.2349C66.4565 40.834 65.9196 41.3513 65.5252 41.5351L58.3055 44.436C59.3232 45.776 61.4721 48.5913 61.9253 49.1321C62.3786 49.673 62.2852 50.0355 62.1819 50.1492C60.7168 51.288 57.6249 53.6852 56.9781 54.1633C56.3314 54.6414 55.9753 54.459 55.8781 54.308L52.0041 49.2359C50.663 51.0408 47.8356 54.8334 47.2549 55.5648C46.6742 56.2963 46.3003 55.7086 46.186 55.3233Z" fill="black"/>
          <path d="M47.1184 53.7101L40.6448 27.8783L63.743 40.814C61.7059 41.6295 57.5023 43.3092 56.9854 43.5044C56.4684 43.6995 56.5471 44.2014 56.6511 44.428L60.6746 49.7174L56.5205 52.945C55.4869 51.5703 53.2912 48.6494 52.7773 47.9637C52.2634 47.278 51.6843 47.5582 51.459 47.784L47.1184 53.7101Z" fill="white"/>
          <defs>
          <filter id="filter0_d_533_1375" x="21.8457" y="6.86426" width="31.5054" height="31.5054" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="2"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.73 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_533_1375"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_533_1375" result="shape"/>
          </filter>
          <linearGradient id="paint0_linear_533_1375" x1="0" y1="20.617" x2="27.0281" y2="20.617" gradientUnits="userSpaceOnUse">
          <stop stop-color="#EBF9F6"/>
          <stop offset="1" stop-color="#EBF9F6" stop-opacity="0"/>
          </linearGradient>
          </defs>
        </svg>
        <div class="message-content">
          <strong>Use the slider</strong>
          <span>in the canvas to tweak your selection.</span>
        </div>
      </div>
    {:else}
      <div class="message-card orange">
        <svg class="message-card-graphic" width="51" height="55" viewBox="0 0 51 55" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Illustration of a mouse cursor">
          <path d="M29.9609 20.1047L44.7886 9.89996" stroke="black" stroke-width="2" stroke-linecap="round"/>
          <path d="M16.1152 15.8279L5.9104 1.00012" stroke="black" stroke-width="2" stroke-linecap="round"/>
          <path d="M25.3758 14.4697L27.5551 2.66927" stroke="black" stroke-width="2" stroke-linecap="round"/>
          <path d="M12.8006 23.1243L1.00018 20.945" stroke="black" stroke-width="2" stroke-linecap="round"/>
          <path d="M1.59845 39.6245L16.4262 29.4197" stroke="black" stroke-width="2" stroke-linecap="round"/>
          <path d="M27.0962 50.2747L19.8768 21.5287C19.7484 20.5521 20.3945 20.6919 20.7336 20.8838C28.8562 25.4017 45.3532 34.5872 46.36 35.1863C47.3667 35.7854 46.8297 36.3027 46.4354 36.4865L39.2156 39.3874C40.2334 40.7274 42.3823 43.5427 42.8355 44.0835C43.2888 44.6244 43.1954 44.9869 43.0921 45.1006C41.627 46.2394 38.5351 48.6367 37.8883 49.1147C37.2416 49.5928 36.8855 49.4104 36.7883 49.2594L32.9143 44.1873C31.5732 45.9922 28.7458 49.7848 28.1651 50.5163C27.5844 51.2477 27.2105 50.66 27.0962 50.2747Z" fill="black"/>
          <path d="M28.0286 48.6615L21.555 22.8298L44.6532 35.7654C42.6161 36.5809 38.4125 38.2606 37.8955 38.4558C37.3786 38.651 37.4573 39.1529 37.5613 39.3794L41.5848 44.6688L37.4307 47.8965C36.3971 46.5217 34.2014 43.6008 33.6875 42.9151C33.1736 42.2294 32.5945 42.5096 32.3691 42.7354L28.0286 48.6615Z" fill="white"/>
        </svg>
        <div class="message-content">
          <strong>Click or tap</strong>
          <span>on the part of the page you'd like to monitor.</span>
        </div>
      </div>
    {/if}

    <div class="selector-panel">
      <button class="selector-panel-toggle" onclick={() => selectorPanelOpen = !selectorPanelOpen}>
        <span class="toggle-arrow" class:open={selectorPanelOpen}><ChevronRight /></span>
        <div class="selector-panel-text">
          <span>Familiar with CSS?</span>
          <strong>Customize the selector</strong>
        </div>
      </button>
      {#if selectorPanelOpen}
        <div class="selector-value">
          <textarea
            class="selector-input"
            rows="4"
            value={editedSelector}
            oninput={handleSelectorInput}
          ></textarea>
          {#if selectorError}
            <p class="selector-error">{selectorError}</p>
          {/if}
        </div>
      {/if}
    </div>
  </main>
  <footer class="button-row">
    <button
      class="btn-primary"
      onclick={() => router.navigate("saveAlert")}
    >
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

  header, main, footer {
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
    font-size: 20px;
    font-weight: 600;
    color: #000;
    line-height: 1.2;
  }

  .description {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    color: #000;
  }

  .message-card {
    display: flex;
    align-items: flex-start;
    min-height: 100px;
    gap: 0.5em;
    border-radius: 0.5em;
    border-width: 0.125em;
    border-style: solid;
  }

  .message-card.orange {
    background: #fff0ee;
    border-color: #ec7b6b;
  }

  .message-card.green {
    background: #ebf9f6;
    border-color: #27c6a2;
  }

  .message-card-graphic {
    margin-left: 1em;
    height: 80px;
    width: auto;
  }

  .message-content {
    padding: 1em 0.5em;
    font-size: 16px;
    line-height: 1.3;
    color: #000;
  }

  .message-content strong {
    display: block;
    margin-bottom: 2px;
  }

  .selector-panel {
    background: #eef3f9;
    border: 2px solid #b5ceed;
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .selector-panel-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .toggle-arrow {
    font-size: 18px;
    color: #233944;
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .toggle-arrow.open {
    transform: rotate(90deg);
  }

  .selector-panel-text {
    flex: 1 1 auto;
    font-size: 16px;
    line-height: 1.3;
    color: #233944;
  }

  .selector-panel-text strong {
    display: block;
  }

  .selector-value {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .selector-input {
    background: #fff;
    border: 1px solid #b5ceed;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 13px;
    font-family: monospace;
    color: #233944;
    word-break: break-all;
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
  }

  .selector-input:focus {
    outline: 2px solid #5a9fd4;
    outline-offset: -1px;
  }

  .selector-error {
    margin: 0;
    font-size: 12px;
    color: #c41a4d;
    line-height: 1.3;
  }
</style>
