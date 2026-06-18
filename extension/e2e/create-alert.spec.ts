import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { scheduleValues } from "./support/api";
import { renderSignedIn } from "./support/render";

// Flow: Create an alert.
//    From the list view, clicking "Create a new alert" activates the canvas (CreateAlert)
//    Clicking "Add alert details" advances to the form (SaveAlert), then clicking "Save alert"
//    POSTs a new addon_event. Covered in both modes: watching the whole page and watching a picked region.
//
//    UI clicks/assertions run against `panel` (sidepanel.html); picking a region
//    happens on the host `page`, where the Canvas content script listens.

/** List → CreateAlert (the picker step). */
async function startCreating(panel: Page) {
  await panel.getByRole("button", { name: "Create a new alert" }).click();
  await expect(
    panel.getByRole("heading", { name: "Create an alert" }),
  ).toBeVisible();
}

test("create an alert watching the whole page", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel, requests } = await renderSignedIn(
    context,
    page,
    serviceWorker,
  );
  await startCreating(panel);

  // No selection made → advance straight to the details form.
  await panel.getByRole("button", { name: "Add alert details" }).click();

  await expect(
    panel.getByRole("heading", { name: "Save alert" }),
  ).toBeVisible();
  await expect(panel.getByText("the entire page")).toBeVisible();

  await panel.locator("#alert-name").fill("Homepage watch");
  await panel.locator("#frequency").selectOption("daily");
  await panel.getByRole("button", { name: "Save alert" }).click();

  // Success lands back on the list with a confirmation toast.
  await expect(panel.getByText("Alert saved successfully!")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Create a new alert" }),
  ).toBeVisible();

  expect(requests.created).toHaveLength(1);
  expect(requests.created[0].event).toBe(scheduleValues.daily);
  expect(requests.created[0].parameters.title).toBe("Homepage watch");
  // Whole page → "*" selector.
  expect(requests.created[0].parameters.selector).toBe("*");
});

test("create an alert watching a page selection", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel, requests } = await renderSignedIn(
    context,
    page,
    serviceWorker,
  );
  await startCreating(panel);

  // Click an element on the host page to lock a selection. The canvas listens
  // on the window (capture phase) of the host tab, so a real click there picks
  // and locks the target; the locked selection streams back to the panel.
  await page.locator("h1").click();

  await panel.getByRole("button", { name: "Add alert details" }).click();

  // The form now reflects that only part of the page is being watched.
  await expect(
    panel.getByRole("heading", { name: "Save alert" }),
  ).toBeVisible();
  await expect(panel.getByText("part of the page")).toBeVisible();

  await panel.getByRole("button", { name: "Save alert" }).click();

  await expect(panel.getByText("Alert saved successfully!")).toBeVisible();
  expect(requests.created).toHaveLength(1);
  // A region was picked, so a non-empty selector is sent.
  expect(requests.created[0].parameters.selector).toBeTruthy();
});

// Accessibility of the create flow's two views.
test.describe("accessibility", () => {
  test("CreateAlert (picker) has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker);
    await startCreating(panel);

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("SaveAlert (details form) has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    const { panel } = await renderSignedIn(context, page, serviceWorker);
    await startCreating(panel);
    await panel.getByRole("button", { name: "Add alert details" }).click();
    await expect(
      panel.getByRole("heading", { name: "Save alert" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(panel, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
