import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { scheduleValues } from "./support/api";
import { renderSignedIn, renderSignedOut } from "./support/render";
import { scheduled } from "../src/test/fixtures/events";

// ListAlerts is the app's home view. These tests render the injected sidebar
// (open shadow DOM on #klaxon-host) and drive it through real clicks. Setup
// lives in support/render.ts so every view spec shares the same harness.

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

// Flow 4: edit multiple alerts from the list. The toolbar's "Select all" and
// per-row checkboxes feed a bulk "Disable", which PATCHes each selected alert
// to the disabled schedule.
test.describe("bulk actions", () => {
  test('"Select all" selects every row and disables them together', async ({
    context,
    page,
    serviceWorker,
  }) => {
    const requests = await renderSignedIn(context, page, serviceWorker);
    await expect(page.locator(".row")).toHaveCount(scheduled.results.length);

    // Disable is inert until something is selected.
    const disable = page.getByRole("button", { name: "Disable" });
    await expect(disable).toBeDisabled();

    await page.getByRole("checkbox").first().check(); // the toolbar select-all
    await expect(
      page.getByText(`${scheduled.results.length} selected`),
    ).toBeVisible();
    await expect(disable).toBeEnabled();

    await disable.click();

    await expect(
      page.getByText(`${scheduled.results.length} alerts disabled.`),
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
    const requests = await renderSignedIn(context, page, serviceWorker);
    await expect(page.locator(".row")).toHaveCount(scheduled.results.length);

    // The first checkbox is the toolbar's select-all; the rest are per-row.
    await page.locator(".row input[type='checkbox']").first().check();
    await expect(page.getByText("1 selected")).toBeVisible();

    await page.getByRole("button", { name: "Disable" }).click();

    await expect(page.getByText("Alert disabled.")).toBeVisible();
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
