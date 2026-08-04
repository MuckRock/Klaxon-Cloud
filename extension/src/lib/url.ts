/**
 * Absolutize a page-advertised URL against the current document. Pages are free
 * to declare a *relative* canonical (Socrata does), and a bare path is no use to
 * anyone downstream: it's stored as an alert's `site` — which the backend later
 * re-fetches — and compared against tab URLs. Returns null when the value can't
 * be resolved at all, so the caller can fall through to the next candidate.
 */
function absolute(href: string): string | null {
  try {
    return new URL(href, window.location.href).href;
  } catch (_) {
    return null;
  }
}

/** Resolve the canonical URL for the current page. */
export function getCanonicalURL(): string {
  try {
    const og = document
      .querySelector("meta[property='og:url']")
      ?.getAttribute("content");
    const resolved = og && absolute(og);
    if (resolved) return resolved;
  } catch (_) {
    /* ignore */
  }
  try {
    const linkRel = document
      .querySelector("link[rel='canonical']")
      ?.getAttribute("href");
    const resolved = linkRel && absolute(linkRel);
    if (resolved) return resolved;
  } catch (_) {
    /* ignore */
  }
  return window.location.href;
}

/**
 * Resolve the page's title — the value the backend uses to name an alert when
 * no custom title is provided.
 */
export function getCanonicalTitle(): string {
  try {
    const og = document
      .querySelector("meta[property='og:title']")
      ?.getAttribute("content");
    if (og) return og;
  } catch (_) {
    /* ignore */
  }
  return document.title;
}
