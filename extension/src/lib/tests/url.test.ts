import { describe, it, expect, beforeEach } from "vitest";
import { getCanonicalURL } from "../url";

describe("getCanonicalURL", () => {
  beforeEach(() => {
    // Clear any meta/link tags from previous tests
    document.head.innerHTML = "";
  });

  it("returns og:url when present", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:url");
    meta.setAttribute("content", "https://example.com/og-page");
    document.head.appendChild(meta);

    expect(getCanonicalURL()).toBe("https://example.com/og-page");
  });

  it("returns canonical link when og:url is absent", () => {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", "https://example.com/canonical-page");
    document.head.appendChild(link);

    expect(getCanonicalURL()).toBe("https://example.com/canonical-page");
  });

  it("prefers og:url over canonical link", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:url");
    meta.setAttribute("content", "https://example.com/og");
    document.head.appendChild(meta);

    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", "https://example.com/canonical");
    document.head.appendChild(link);

    expect(getCanonicalURL()).toBe("https://example.com/og");
  });

  it("falls back to window.location.href when neither is present", () => {
    expect(getCanonicalURL()).toBe(window.location.href);
  });

  // A page may advertise a *relative* canonical (Socrata does — see issue #94).
  // Returned verbatim, a bare path is stored as an alert's `site`, which the
  // backend can't fetch, and compares equal to nothing when matched against a
  // tab's URL. Resolve everything against the document.
  it("absolutizes a relative canonical link", () => {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", "/data/archive");
    document.head.appendChild(link);

    expect(getCanonicalURL()).toBe(
      new URL("/data/archive", window.location.href).href,
    );
  });

  it("absolutizes a relative og:url", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:url");
    meta.setAttribute("content", "page/two");
    document.head.appendChild(meta);

    expect(getCanonicalURL()).toBe(
      new URL("page/two", window.location.href).href,
    );
  });

  it("falls through to the canonical link when og:url is unresolvable", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:url");
    meta.setAttribute("content", "http://");
    document.head.appendChild(meta);

    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", "https://example.com/canonical");
    document.head.appendChild(link);

    expect(getCanonicalURL()).toBe("https://example.com/canonical");
  });

  it("falls back to window.location.href when the canonical is unresolvable", () => {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", "http://");
    document.head.appendChild(link);

    expect(getCanonicalURL()).toBe(window.location.href);
  });
});
