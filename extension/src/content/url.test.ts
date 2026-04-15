import { describe, it, expect, beforeEach } from "vitest";
import { getCanonicalURL } from "./url";

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
});
