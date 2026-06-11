import { expect, openSidebar, signIn, signOut, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { makeStoredAuth } from "./support/auth";
import { scheduled } from "../src/test/fixtures/events";
import { runs } from "../src/test/fixtures/runs";
import type { BrowserContext, Page, Worker } from "@playwright/test";

// These tests render the injected sidebar (open shadow DOM on #klaxon-host).
// Playwright locators pierce open shadow roots automatically, so we assert on
// the UI without any shadow-specific traversal.

// Render the signed-out sidebar: no stored auth → authState stays idle →
// ListAlerts' data effect returns early and Welcome shows its sign-in branch.
async function renderSignedOut(page: Page, serviceWorker: Worker) {
  await signOut(serviceWorker);
  await openSidebar(page, serviceWorker);
}

// Render the signed-in alerts list. Mock the DocumentCloud API the *service
// worker* fetches — context.route (not page.route) is required because the
// fetch originates in the SW; match on path so the baked-in host is irrelevant.
// Seed auth before injecting: restore() reads it once at boot and the ListAlerts
// effect fires its fetch on mount.
async function renderSignedIn(
  context: BrowserContext,
  page: Page,
  serviceWorker: Worker,
) {
  await context.route("**/addon_events/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(scheduled),
    }),
  );
  await context.route("**/addon_runs/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(runs),
    }),
  );
  await signIn(serviceWorker, makeStoredAuth());
  await openSidebar(page, serviceWorker);
}

test("signed out: shows the Welcome sign-in state", async ({
  page,
  serviceWorker,
}) => {
  await renderSignedOut(page, serviceWorker);

  await expect(page.getByText("Welcome to Klaxon!")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with MuckRock" }),
  ).toBeVisible();
});

test("signed in: shows the list of alerts", async ({
  context,
  page,
  serviceWorker,
}) => {
  await renderSignedIn(context, page, serviceWorker);

  // Authenticated chrome: the Sign out button only renders when authenticated.
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  // The count heading and one row per scheduled event from the fixture.
  await expect(
    page.getByText(`${scheduled.results.length} alerts`),
  ).toBeVisible();
  await expect(page.locator(".row")).toHaveCount(scheduled.results.length);
});

// Accessibility scans of the same view in each auth state. Kept in their own
// suite (separate from the functional assertions above) and strict: a WCAG 2
// A/AA violation in the rendered sidebar fails the test. scanSidebar attaches
// the full axe report and logs each offending element. This is the template for
// a11y-checking future views.
test.describe("accessibility", () => {
  test("signed out: Welcome state has no WCAG A/AA violations", async ({
    page,
    serviceWorker,
  }, testInfo) => {
    await renderSignedOut(page, serviceWorker);
    await expect(page.getByText("Welcome to Klaxon!")).toBeVisible();

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("signed in: alerts list has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    await renderSignedIn(context, page, serviceWorker);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
