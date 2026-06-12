import { expect, test } from "./fixtures";
import { renderSignedOut } from "./support/render";
import { hostTokenNames } from "./support/tokens";

// CSS isolation: the sidebar lives in an open shadow root, which blocks normal
// style inheritance — but custom properties (CSS variables) DO inherit across
// the shadow boundary. App.svelte defends against this by re-declaring every
// design token on :host, so host-page tokens of the same name can't reach the
// sidebar. support/test-page.html sets garish poison values for those same
// tokens on :root; this spec fails if any of them reach the rendered sidebar.

// Derived from App.svelte's :host block, so adding a token there automatically
// extends this test (the sanity check below then requires a poison value for
// it in support/test-page.html).
const TOKENS = hostTokenNames();

test("host-page custom properties don't leak into the sidebar", async ({
  page,
  serviceWorker,
}) => {
  await renderSignedOut(page, serviceWorker);
  await expect(page.locator(".sidebar")).toBeVisible();

  const tokens = await page.evaluate((names) => {
    const host = document.getElementById("klaxon-host");
    const sidebar = host?.shadowRoot?.querySelector(".sidebar");
    if (!sidebar) throw new Error("sidebar not found in shadow root");

    // Read each token as it resolves on the host page (the poison) and as it
    // resolves inside the sidebar (should be the extension's own value).
    const onHostPage = getComputedStyle(document.documentElement);
    const inSidebar = getComputedStyle(sidebar);
    return names.map((name) => ({
      name,
      hostPage: onHostPage.getPropertyValue(name).trim(),
      sidebar: inSidebar.getPropertyValue(name).trim(),
    }));
  }, TOKENS);

  // Sanity-check the trap actually loaded: every token must carry a poison
  // value on the host page, otherwise a leak couldn't be detected.
  const missingPoison = tokens.filter((t) => !t.hostPage);
  expect(
    missingPoison.map((t) => t.name),
    "test-page.html didn't define poison values for these tokens",
  ).toEqual([]);

  // A leak is any token whose sidebar value matches the host-page poison.
  const leaked = tokens.filter((t) => t.sidebar === t.hostPage);
  expect(
    leaked,
    "host-page tokens leaked into the sidebar (App.svelte :host doesn't define them)",
  ).toEqual([]);
});
