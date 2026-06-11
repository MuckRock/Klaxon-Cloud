import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { scheduleValues } from "./support/api";
import { renderSignedIn } from "./support/render";
import { scheduled } from "../src/test/fixtures/events";
import { getSiteLabel } from "../src/lib/utils";
import type { Page } from "@playwright/test";

// Flow 2: edit an existing alert and its selection. From the list, an alert's
// title opens ViewAlert; "Edit alert" opens the EditAlert form; and from there
// "Edit selection" opens the EditSelection picker. Both editors PATCH the alert.

const ALERT = scheduled.results[0];
const ALERT_LABEL = getSiteLabel(ALERT);

/** List → ViewAlert → EditAlert. */
async function openEditAlert(page: Page) {
  await page.getByRole("button", { name: ALERT_LABEL }).click();
  await page.getByRole("button", { name: "Edit alert" }).click();
  await expect(page.getByRole("heading", { name: "Edit alert" })).toBeVisible();
}

test("editing an alert's details saves the changes", async ({
  context,
  page,
  serviceWorker,
}) => {
  const requests = await renderSignedIn(context, page, serviceWorker);
  await openEditAlert(page);

  await page.locator("#alert-name").fill("Renamed alert");
  await page.locator("#frequency").selectOption("hourly");
  await page.getByRole("button", { name: "Update alert" }).click();

  // Success returns to the list with a confirmation toast.
  await expect(page.getByText("Alert saved successfully!")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create a new alert" }),
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
  const requests = await renderSignedIn(context, page, serviceWorker);
  await openEditAlert(page);

  await page.getByRole("button", { name: "Edit selection" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit selection" }),
  ).toBeVisible();

  // Pick a region on the page, then save it.
  await page.locator("h1").click();
  await page.getByRole("button", { name: "Save selection" }).click();

  await expect(page.getByText("Selection saved.")).toBeVisible();
  // Saving returns to the originating editor (EditAlert), not the list.
  await expect(page.getByRole("heading", { name: "Edit alert" })).toBeVisible();

  expect(requests.updated).toHaveLength(1);
  expect(requests.updated[0].id).toBe(ALERT.id);
  expect(requests.updated[0].payload.parameters.selector).toBeTruthy();
});

test.describe("accessibility", () => {
  test("EditAlert has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    await renderSignedIn(context, page, serviceWorker);
    await openEditAlert(page);

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("EditSelection has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    await renderSignedIn(context, page, serviceWorker);
    await openEditAlert(page);
    await page.getByRole("button", { name: "Edit selection" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit selection" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
