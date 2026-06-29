import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import {
  eventsPage,
  makeEvent,
  runsForEvent,
  scheduleValues,
} from "./support/api";
import { renderSignedIn } from "./support/render";
import { scheduled } from "@klaxon/lib/fixtures/events";
import { getSiteLabel } from "@klaxon/lib/utils";
import type { Page } from "@playwright/test";

// Flow: view an alert.
//    Clicking an alert's title in the list opens ViewAlert,
//    which shows the alert's details and its recent change history.

const ALERT = scheduled.results[0];
const ALERT_LABEL = getSiteLabel(ALERT);

// A disabled alert (schedule 0). getSiteLabel falls back to the title.
const DISABLED_ALERT = makeEvent({
  id: 555,
  event: scheduleValues.disabled,
  parameters: { title: "Disabled alert" },
});

/** Render the list with change history for the first alert, then open it. */
async function openAlert(panel: Page) {
  await panel.getByRole("button", { name: ALERT_LABEL }).click();
  await expect(panel.getByRole("heading", { name: ALERT_LABEL })).toBeVisible();
}

test("opening an alert shows its details and recent changes", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker, {
    runs: runsForEvent(ALERT),
  });
  await expect(panel.locator(".row")).toHaveCount(scheduled.results.length);

  await openAlert(panel);

  // Details: the watched site and its check frequency (event 3 → weekly).
  // This alert carries a selector, so it watches part of the page.
  await expect(panel.getByText("part of the page")).toBeVisible();
  await expect(
    panel.getByRole("link", { name: ALERT.parameters.site }),
  ).toBeVisible();
  await expect(panel.getByText("weekly")).toBeVisible();

  // History section is populated from the runs we pointed at this alert.
  await expect(
    panel.getByRole("heading", { name: "Recent changes" }),
  ).toBeVisible();
  await expect(panel.locator(".alert-detail .table-row").first()).toBeVisible();

  // The view's own action leads into the edit flow.
  await expect(panel.getByRole("button", { name: "Edit alert" })).toBeVisible();
});

test("an alert with no history shows the empty changes message", async ({
  context,
  page,
  serviceWorker,
}) => {
  // Default mock returns no runs.
  const { panel } = await renderSignedIn(context, page, serviceWorker);
  await openAlert(panel);

  await expect(
    panel.getByText("No changes have been recorded for this alert yet."),
  ).toBeVisible();
});

test("viewing a disabled alert shows the disabled schedule", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker, {
    events: eventsPage([DISABLED_ALERT]),
  });

  await panel.getByRole("button", { name: "Disabled alert" }).click();
  await expect(
    panel.getByRole("heading", { name: "Disabled alert" }),
  ).toBeVisible();
  // The frequency detail reflects the disabled schedule.
  await expect(panel.getByText("disabled", { exact: true })).toBeVisible();
});

test.describe("accessibility", () => {
  test("ViewAlert has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker, {
      runs: runsForEvent(ALERT),
    });
    await openAlert(panel);
    await expect(
      panel.getByRole("heading", { name: "Recent changes" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
