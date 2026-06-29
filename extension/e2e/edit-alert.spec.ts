import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { eventsPage, makeEvent, scheduleValues } from "./support/api";
import { renderSignedIn } from "./support/render";
import { scheduled } from "@klaxon/lib/fixtures/events";
import { getSiteLabel } from "@klaxon/lib/utils";

// Flow: edit an existing alert and its selection.
//    From the list, an alert's title opens ViewAlert;
//    "Edit alert" opens the EditAlert form; and from there
//    "Edit selection" opens the EditSelection picker.
//    Both editors PATCH the alert.
//
//    UI runs against `panel`; re-picking a region happens on the host `page`.

const ALERT = scheduled.results[0];
const ALERT_LABEL = getSiteLabel(ALERT);

// A disabled alert (schedule 0): EditAlert shows a Reactivate action instead of
// the schedule picker. getSiteLabel falls back to the title.
const DISABLED_ALERT = makeEvent({
  id: 555,
  event: scheduleValues.disabled,
  parameters: { title: "Disabled alert" },
});

/** List → ViewAlert → EditAlert for the given alert label. */
async function openEditAlert(panel: Page, label = ALERT_LABEL) {
  await panel.getByRole("button", { name: label }).click();
  await panel.getByRole("button", { name: "Edit alert" }).click();
  await expect(
    panel.getByRole("heading", { name: "Edit alert" }),
  ).toBeVisible();
}

test("editing an alert's details saves the changes", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel, requests } = await renderSignedIn(
    context,
    page,
    serviceWorker,
  );
  await openEditAlert(panel);

  await panel.locator("#alert-name").fill("Renamed alert");
  await panel.locator("#frequency").selectOption("hourly");
  await panel.getByRole("button", { name: "Update alert" }).click();

  // Success returns to the list with a confirmation toast.
  await expect(panel.getByText("Alert saved successfully!")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Create a new alert" }),
  ).toBeVisible();

  expect(requests.updated).toHaveLength(1);
  expect(requests.updated[0].id).toBe(ALERT.id);
  expect(requests.updated[0].payload.event).toBe(scheduleValues.hourly);
  expect(requests.updated[0].payload.parameters.title).toBe("Renamed alert");
});

test("editing an alert's selection saves and returns to the alert", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel, requests } = await renderSignedIn(
    context,
    page,
    serviceWorker,
  );
  await openEditAlert(panel);

  await panel.getByRole("button", { name: "Edit selection" }).click();
  await expect(
    panel.getByRole("heading", { name: "Edit selection" }),
  ).toBeVisible();

  // Pick a region on the host page, then save it from the panel.
  await page.locator("h1").click();
  await panel.getByRole("button", { name: "Save selection" }).click();

  await expect(panel.getByText("Selection saved.")).toBeVisible();
  // Saving returns to the originating editor (EditAlert), not the list.
  await expect(
    panel.getByRole("heading", { name: "Edit alert" }),
  ).toBeVisible();

  expect(requests.updated).toHaveLength(1);
  expect(requests.updated[0].id).toBe(ALERT.id);
  expect(requests.updated[0].payload.parameters.selector).toBeTruthy();
});

test("reactivating a disabled alert re-enables it on a weekly schedule", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel, requests } = await renderSignedIn(
    context,
    page,
    serviceWorker,
    { events: eventsPage([DISABLED_ALERT]) },
  );
  await openEditAlert(panel, "Disabled alert");

  // The disabled alert shows a Reactivate action in place of the schedule picker.
  await expect(
    panel.getByText("This alert is currently disabled."),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Reactivate" }).click();

  await expect(panel.getByText("Alert reactivated")).toBeVisible();
  expect(requests.updated).toHaveLength(1);
  expect(requests.updated[0].id).toBe(DISABLED_ALERT.id);
  expect(requests.updated[0].payload.event).toBe(scheduleValues.weekly);
});

test.describe("accessibility", () => {
  test("EditAlert has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker);
    await openEditAlert(panel);

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("EditAlert (disabled, with Reactivate) has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker, {
      events: eventsPage([DISABLED_ALERT]),
    });
    await openEditAlert(panel, "Disabled alert");
    await expect(
      panel.getByRole("button", { name: "Reactivate" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("EditSelection has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker);
    await openEditAlert(panel);
    await panel.getByRole("button", { name: "Edit selection" }).click();
    await expect(
      panel.getByRole("heading", { name: "Edit selection" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
