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
