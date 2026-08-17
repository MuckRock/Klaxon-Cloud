<script lang="ts">
  import MuckRockLogo from "./MuckRockLogo.svelte";
</script>

<footer class="site-footer">
  <div class="inner">
    <div class="callout">
      <p>
        <strong
          >Want to learn how to use Klaxon Cloud and other MuckRock products?</strong
        >
      </p>
      <p>
        Join one of our free <a
          href="https://www.muckrock.com/project/building-with-muckrock-1178/"
          >Building with MuckRock training sessions</a
        >.
      </p>
    </div>
  </div>
  <div class="inner">
    <a
      class="brand"
      href="https://www.muckrock.com"
      aria-label="MuckRock Foundation"
      target="_blank"
      rel="noopener noreferrer"
    >
      <MuckRockLogo />
    </a>

    <div class="about">
      <p>
        Klaxon Cloud is a project of the <a
          href="https://www.muckrock.com"
          target="_blank"
          rel="noopener noreferrer">MuckRock Foundation</a
        >, a <span class="nowrap">501(c)(3)</span> organization committed to trust,
        transparency, and civic engagement.
      </p>
      <p class="support">
        Klaxon Cloud is free to use. If it's useful to you, please <a
          href="https://www.muckrock.com/donate/"
          target="_blank"
          rel="noopener noreferrer">donate to support our work</a
        >.
      </p>
      <p>
        Our <a
          href="https://www.muckrock.com/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer">privacy policy</a
        >
        and
        <a
          href="https://www.muckrock.com/tos/"
          target="_blank"
          rel="noopener noreferrer">terms of service</a
        > apply to all users on this site.
      </p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    display: flex;
    flex-flow: row-reverse wrap;
    border-top: 1px solid var(--gray-2);
    background: var(--klaxon-bg-dark);
  }

  /* Matches the header's inner width so the wordmark lines up with the logo. */
  .inner {
    flex: 1 1 24rem;
    max-width: 24rem;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }

  .brand {
    display: block;
    flex: 0 0 auto;
  }

  .brand :global(svg) {
    max-height: 1.5rem;
    width: auto;
  }

  .about {
    max-width: 34rem;
  }

  .about p {
    margin: 0 0 0.5rem;
    font-size: var(--font-sm);
    color: var(--gray-4);
    text-wrap: pretty;
  }

  .about p:last-child {
    margin-bottom: 0;
  }

  .nowrap {
    white-space: nowrap;
  }

  .callout {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    width: 100%;
    background: var(--klaxon-bg);
    border: 1px solid var(--gray-2);
    border-radius: 0.5em;
    padding: 1rem;
  }

  .callout p {
    margin: 0;
  }

  .callout strong {
    font-weight: 600;
  }

  /* Stack the wordmark above the text once they can't sit side by side. */
  @media (max-width: 50rem) {
    .inner {
      max-width: unset;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem 1rem;
    }

    .brand {
      flex: none;
    }
  }
</style>
