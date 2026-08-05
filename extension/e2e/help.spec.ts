import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { renderSignedIn, renderSignedOut } from "./support/render";
import { HELP_FAQ_URL, HELP_GUIDE_URL, SUPPORT_EMAIL } from "@klaxon/lib/help";

// The Help dropdown in the panel header (the shared @klaxon/lib HelpMenu). The
// extension hands chosen links to `chrome.tabs.create` rather than following
// them, so these tests assert on the anchors' hrefs instead of clicking through
// — what matters is that all three destinations are right and that the support
// mailto arrives prefilled with the account details support would ask for.

/** Open the Help menu and hand back the panel's menu locator. */
async function openHelp(panel: import("@playwright/test").Page) {
  await panel.getByRole("button", { name: "Help" }).click();
  const menu = panel.locator(".menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** The decoded body of the menu's `mailto:` link. */
async function mailtoBody(panel: import("@playwright/test").Page) {
  const href = await panel
    .locator('.menu a[href^="mailto:"]')
    .getAttribute("href");
  return new URL(href!).searchParams.get("body") ?? "";
}

test("signed out: the help menu is still available", async ({
  context,
  page,
  serviceWorker,
}) => {
  const panel = await renderSignedOut(context, page, serviceWorker);
  const menu = await openHelp(panel);

  await expect(menu.getByRole("link", { name: /User Guide/ })).toHaveAttribute(
    "href",
    HELP_GUIDE_URL,
  );
  await expect(menu.getByRole("link", { name: /FAQ/ })).toHaveAttribute(
    "href",
    HELP_FAQ_URL,
  );

  // Nobody to identify, so the details block says as much rather than omitting
  // the user silently.
  expect(await mailtoBody(panel)).toContain("Signed in: no");
});

test("signed in: the support email is prefilled with the account", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker);
  await openHelp(panel);

  const mailto = await panel
    .locator('.menu a[href^="mailto:"]')
    .getAttribute("href");
  const url = new URL(mailto!);

  expect(url.pathname).toBe(SUPPORT_EMAIL);
  expect(url.searchParams.get("subject")).toBe("[Klaxon Cloud]");

  const body = url.searchParams.get("body") ?? "";
  expect(body).toContain("Name: Ada Lovelace");
  expect(body).toContain("Email: ada@example.com");
  expect(body).toContain("Username: ada");
  expect(body).toContain("Account ID: 00000000-0000-0000-0000-000000000000");
  // Which build and which browser is asking.
  expect(body).toMatch(/Klaxon: Browser extension \d/);
  expect(body).toContain("Browser: Mozilla/5.0");
});

test("the help menu closes on Escape", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker);
  const menu = await openHelp(panel);

  await panel.keyboard.press("Escape");

  await expect(menu).toBeHidden();
  await expect(panel.getByRole("button", { name: "Help" })).toBeFocused();
});

test("the open help menu has no accessibility violations", async ({
  context,
  page,
  serviceWorker,
}, testInfo) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker);
  await openHelp(panel);

  const { violations } = await scanSidebar(panel, testInfo);
  expect(violations.map((v) => v.id)).toEqual([]);
});
