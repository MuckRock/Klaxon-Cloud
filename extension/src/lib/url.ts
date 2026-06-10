/** Resolve the canonical URL for the current page. */
export function getCanonicalURL(): string {
  try {
    const og = document
      .querySelector("meta[property='og:url']")
      ?.getAttribute("content");
    if (og) return og;
  } catch (_) {
    /* ignore */
  }
  try {
    const linkRel = document
      .querySelector("link[rel='canonical']")
      ?.getAttribute("href");
    if (linkRel) return linkRel;
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
