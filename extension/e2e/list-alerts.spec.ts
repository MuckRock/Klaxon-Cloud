import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { scheduleValues } from "./support/api";
import { renderSignedIn, renderSignedOut } from "./support/render";
import { scheduled } from "../src/test/fixtures/events";

// ListAlerts is the app's home view. These tests render the side-panel page
// (sidepanel.html, where <App> now lives) and drive it through real clicks,
// while the host page stays the active tab so the list tracks its origin.
// Setup lives in support/render.ts so every view spec shares the same harness.

test("signed out: shows the Welcome sign-in state", async ({
  context,
  page,
  serviceWorker,
}) => {
  const panel = await renderSignedOut(context, page, serviceWorker);

  await expect(panel.getByText("Welcome to Klaxon!")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Sign in with MuckRock" }),
  ).toBeVisible();
});

test("signed in: shows the list of alerts", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker);

  // Authenticated chrome: the Sign out button only renders when authenticated.
  await expect(panel.getByRole("button", { name: "Sign out" })).toBeVisible();

  // The count heading and one row per scheduled event from the fixture.
  await expect(
    panel.getByText(`${scheduled.results.length} alerts`),
  ).toBeVisible();
  await expect(panel.locator(".row")).toHaveCount(scheduled.results.length);
});

// Flow: edit multiple alerts from the list.
//    The toolbar's "Select all" and per-row checkboxes feed a bulk "Disable",
//    which PATCHes each selected alert to the disabled schedule.
test.describe("bulk actions", () => {
  test('"Select all" selects every row and disables them together', async ({
    context,
    page,
    serviceWorker,
  }) => {
    const { panel, requests } = await renderSignedIn(
      context,
      page,
      serviceWorker,
    );
    await expect(panel.locator(".row")).toHaveCount(scheduled.results.length);

    // Disable is inert until something is selected.
    const disable = panel.getByRole("button", { name: "Disable" });
    await expect(disable).toBeDisabled();

    await panel.getByRole("checkbox").first().check(); // the toolbar select-all
    await expect(
      panel.getByText(`${scheduled.results.length} selected`),
    ).toBeVisible();
    await expect(disable).toBeEnabled();

    await disable.click();

    await expect(
      panel.getByText(`${scheduled.results.length} alerts disabled.`),
    ).toBeVisible();
    // One PATCH per alert, each setting the disabled schedule.
    expect(requests.updated).toHaveLength(scheduled.results.length);
    for (const { payload } of requests.updated) {
      expect(payload.event).toBe(scheduleValues.disabled);
    }
  });

  test("disabling a single selected alert reports the singular result", async ({
    context,
    page,
    serviceWorker,
  }) => {
    const { panel, requests } = await renderSignedIn(
      context,
      page,
      serviceWorker,
    );
    await expect(panel.locator(".row")).toHaveCount(scheduled.results.length);

    // The first checkbox is the toolbar's select-all; the rest are per-row.
    await panel.locator(".row input[type='checkbox']").first().check();
    await expect(panel.getByText("1 selected")).toBeVisible();

    await panel.getByRole("button", { name: "Disable" }).click();

    await expect(panel.getByText("Alert disabled.")).toBeVisible();
    expect(requests.updated).toHaveLength(1);
    expect(requests.updated[0].payload.event).toBe(scheduleValues.disabled);
  });
});

// Accessibility scans of the view in each auth state. Strict: a WCAG 2 A/AA
// violation in the rendered sidebar fails the test. scanSidebar attaches the
// full axe report and logs each offending element. This is the template for
// a11y-checking every view.
test.describe("accessibility", () => {
  test("signed out: Welcome state has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const panel = await renderSignedOut(context, page, serviceWorker);
    await expect(panel.getByText("Welcome to Klaxon!")).toBeVisible();

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("signed in: alerts list has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker);
    await expect(panel.getByRole("button", { name: "Sign out" })).toBeVisible();

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
