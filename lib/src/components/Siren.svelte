<script lang="ts">
  // The Klaxon lamp with spinning beams, shared by the extension's welcome and
  // empty states and the web app's signed-out homepage.
  //
  // Two things the consumer owns:
  //
  // - Scale, through the `--siren-height`, `--siren-size` and `--siren-offset`
  //   custom properties (defaults suit the extension's narrow panel).
  // - A stacking context on an ancestor (`isolation: isolate`), so the beams'
  //   negative z-index tucks them behind the surrounding text rather than
  //   dropping them behind the page background.
  import Logo from "./Logo.svelte";

  interface Props {
    // When true, the siren is "off": the spinning beams are hidden and the
    // lamp is drawn in a muted dark color. Used to signal that a signed-in
    // user has no active alerts for the current page/site.
    dimmed?: boolean;
  }

  let { dimmed = false }: Props = $props();

  // Eight beams at 45° intervals, radiating from the center of the
  // illustration (which is anchored on the logo). Each is a slim wedge
  // filled with a radial gradient so it glows near the lamp and fades to
  // nothing at the rim. The whole group spins to read as a flashing siren.
  const beams = [0, 45, 90, 135, 180, 225, 270, 315];

  // Half-width of a beam's base, in viewBox units, at radius 100.
  const halfWidth = 15;

  // Gradient ids are document-global, so scope ours to this instance.
  const gradientId = $props.id();
</script>

<div class="siren" class:dimmed title="Klaxon">
  {#if !dimmed}
    <svg class="beams" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx="100" cy="100" r="100">
          <stop offset="0" stop-color="var(--red-3)" stop-opacity="0" />
          <stop offset="0.18" stop-color="var(--red-3)" stop-opacity="0.55" />
          <stop offset="0.55" stop-color="#f2789c" stop-opacity="0.3" />
          <stop offset="1" stop-color="var(--red-3)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <g class="spin">
        {#each beams as angle (angle)}
          <polygon
            points={`100,100 ${100 - halfWidth},0 ${100 + halfWidth},0`}
            fill="url(#{gradientId})"
            transform={`rotate(${angle} 100 100)`}
          />
        {/each}
      </g>
    </svg>

    <!-- Obscures beams as they swing below the lamp, so the light reads as
         coming from the siren rather than from underneath it. -->
    <div class="floor"></div>
  {/if}

  <div class="logo">
    <!-- Fills the lamp's silhouette (including the "k" cutout) with the page
         background so the spinning beams don't show through behind the mark. -->
    <svg class="backing" viewBox="0 0 132 132" aria-hidden="true">
      <path
        d="M84.7643 26.4C94.7646 26.4002 103.394 33.4145 105.438 43.2037L115.811 92.8814C117.181 99.44 112.174 105.6 105.474 105.6H23.7643C16.8903 105.6 11.8488 99.1366 13.5221 92.4693L26.0934 42.3785C28.4508 32.9861 36.894 26.4002 46.5778 26.4H84.7643Z"
      />
    </svg>
    <Logo />
  </div>
</div>

<style>
  .siren {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: var(--siren-height, 16em);
    /* Pulls the following text up into the glow; the beams are mostly empty
       space, so the illustration's box is taller than it looks. */
    margin-bottom: var(--siren-offset, -3em);
    overflow: hidden;
    z-index: -1;
  }

  .beams {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .spin {
    transform-origin: center;
    transform-box: view-box;
    animation: spin 8s linear infinite;
  }

  .floor {
    position: absolute;
    inset: 50% 0 0 0;
    background: linear-gradient(to bottom, transparent 0%, var(--klaxon-bg) 25%);
    pointer-events: none;
  }

  .logo {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--siren-size, 9em);
    height: var(--siren-size, 9em);
  }

  /* Both the backing and the logo are absolutely positioned and fill the
     box, so they overlap exactly. With auto z-index, paint order follows the
     DOM: the backing comes first (underneath), the logo second (on top). */
  .logo :global(svg) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .backing {
    fill: var(--klaxon-bg);
  }

  /* Dimmed siren: no beams, lamp recolored to a muted dark slate. Targets the
     logo mark only (not the .backing, which keeps masking with the page bg so
     the "k" cutout still reads). */
  .dimmed .logo :global(svg):not(.backing) {
    fill: var(--red-4);
    opacity: 0.7;
  }

  .dimmed {
    margin-bottom: 0;
    height: auto;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
  }
</style>
