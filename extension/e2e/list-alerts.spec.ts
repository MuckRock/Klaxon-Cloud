import { expect, openSidebar, signIn, signOut, test } from "./fixtures";
import { makeStoredAuth } from "./support/auth";
import { scheduled } from "../src/test/fixtures/events";
import { runs } from "../src/test/fixtures/runs";

// These tests render the injected sidebar (open shadow DOM on #klaxon-host).
// Playwright locators pierce open shadow roots automatically, so we assert on
// the UI without any shadow-specific traversal.

test("signed out: shows the Welcome sign-in state", async ({
  page,
  serviceWorker,
}) => {
  // No auth record stored → authState stays idle → ListAlerts' data effect
  // returns early and Welcome renders its signed-out branch. No API mock needed.
  await signOut(serviceWorker);

  await openSidebar(page, serviceWorker);

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
  // Mock the DocumentCloud API the service worker fetches. context.route (not
  // page.route) is required because the fetch originates in the SW, not the
  // page. Match on path so the baked-in API host is irrelevant.
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

  // Seed a signed-in record *before* injecting: restore() reads auth once at
  // boot and the ListAlerts effect fires its fetch on mount.
  await signIn(serviceWorker, makeStoredAuth());

  await openSidebar(page, serviceWorker);

  // Authenticated chrome: the Sign out button only renders when authenticated.
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  // The count heading and one row per scheduled event from the fixture.
  await expect(
    page.getByText(`${scheduled.results.length} alerts`),
  ).toBeVisible();
  await expect(page.locator(".row")).toHaveCount(scheduled.results.length);
});
