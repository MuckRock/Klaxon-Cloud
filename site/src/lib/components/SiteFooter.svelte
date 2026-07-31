<script lang="ts">
  import MuckRockLogo from "./MuckRockLogo.svelte";
</script>

<footer class="site-footer">
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
        Klaxon is a project of the <a
          href="https://www.muckrock.com"
          target="_blank"
          rel="noopener noreferrer">MuckRock Foundation</a
        >, a <span class="nowrap">501(c)(3)</span> organization committed to trust,
        transparency, and civic engagement.
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
    border-top: 1px solid var(--gray-2);
    background: var(--klaxon-bg-dark);
  }

  /* Matches the header's inner width so the wordmark lines up with the logo. */
  .inner {
    max-width: 64rem;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 2rem;
  }

  .brand {
    display: block;
    flex: 0 0 12.5rem;
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

  /* Stack the wordmark above the text once they can't sit side by side. */
  @media (max-width: 40rem) {
    .inner {
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem 1rem;
    }

    .brand {
      flex: none;
    }
  }
</style>
