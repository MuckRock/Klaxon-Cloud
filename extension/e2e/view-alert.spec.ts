import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { runsForEvent } from "./support/api";
import { renderSignedIn } from "./support/render";
import { scheduled } from "../src/test/fixtures/events";
import { getSiteLabel } from "../src/lib/utils";
import type { Page } from "@playwright/test";

// Flow 3: view an alert. Clicking an alert's title in the list opens ViewAlert,
// which shows the alert's details and its recent change history.

const ALERT = scheduled.results[0];
const ALERT_LABEL = getSiteLabel(ALERT);

/** Render the list with change history for the first alert, then open it. */
async function openAlert(page: Page) {
  await page.getByRole("button", { name: ALERT_LABEL }).click();
  await expect(page.getByRole("heading", { name: ALERT_LABEL })).toBeVisible();
}

test("opening an alert shows its details and recent changes", async ({
  context,
  page,
  serviceWorker,
}) => {
  await renderSignedIn(context, page, serviceWorker, {
    runs: runsForEvent(ALERT),
  });
  await expect(page.locator(".row")).toHaveCount(scheduled.results.length);

  await openAlert(page);

  // Details: the watched site and its check frequency (event 3 → weekly).
  // This alert carries a selector, so it watches part of the page.
  await expect(page.getByText("part of the page")).toBeVisible();
  await expect(
    page.getByRole("link", { name: ALERT.parameters.site }),
  ).toBeVisible();
  await expect(page.getByText("weekly")).toBeVisible();

  // History section is populated from the runs we pointed at this alert.
  await expect(
    page.getByRole("heading", { name: "Recent changes" }),
  ).toBeVisible();
  await expect(page.locator(".alert-detail .table-row").first()).toBeVisible();

  // The view's own action leads into the edit flow.
  await expect(page.getByRole("button", { name: "Edit alert" })).toBeVisible();
});

test("an alert with no history shows the empty changes message", async ({
  context,
  page,
  serviceWorker,
}) => {
  // Default mock returns no runs.
  await renderSignedIn(context, page, serviceWorker);
  await openAlert(page);

  await expect(
    page.getByText("No changes have been recorded for this alert yet."),
  ).toBeVisible();
});

test.describe("accessibility", () => {
  test("ViewAlert has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    await renderSignedIn(context, page, serviceWorker, {
      runs: runsForEvent(ALERT),
    });
    await openAlert(page);
    await expect(
      page.getByRole("heading", { name: "Recent changes" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
