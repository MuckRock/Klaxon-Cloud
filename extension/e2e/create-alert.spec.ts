import { expect, test } from "./fixtures";
import { scanSidebar } from "./support/a11y";
import { scheduleValues } from "./support/api";
import { renderSignedIn } from "./support/render";

// Flow 1: create an alert. From the list, "Create a new alert" opens the
// picker (CreateAlert), "Add alert details" advances to the form (SaveAlert),
// and "Save alert" POSTs a new addon_event. Covered in both modes: watching
// the whole page (no selection) and watching a picked region.

/** List → CreateAlert (the picker step). */
async function startCreating(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Create a new alert" }).click();
  await expect(
    page.getByRole("heading", { name: "Create an alert" }),
  ).toBeVisible();
}

test("create an alert watching the whole page", async ({
  context,
  page,
  serviceWorker,
}) => {
  const requests = await renderSignedIn(context, page, serviceWorker);
  await startCreating(page);

  // No selection made → advance straight to the details form.
  await page.getByRole("button", { name: "Add alert details" }).click();

  await expect(page.getByRole("heading", { name: "Save alert" })).toBeVisible();
  await expect(page.getByText("the entire page")).toBeVisible();

  await page.locator("#alert-name").fill("Homepage watch");
  await page.locator("#frequency").selectOption("daily");
  await page.getByRole("button", { name: "Save alert" }).click();

  // Success lands back on the list with a confirmation toast.
  await expect(page.getByText("Alert saved successfully!")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create a new alert" }),
  ).toBeVisible();

  expect(requests.created).toHaveLength(1);
  expect(requests.created[0].event).toBe(scheduleValues.daily);
  expect(requests.created[0].parameters.title).toBe("Homepage watch");
  // Whole page → no selector.
  expect(requests.created[0].parameters.selector).toBe("");
});

test("create an alert watching a page selection", async ({
  context,
  page,
  serviceWorker,
}) => {
  const requests = await renderSignedIn(context, page, serviceWorker);
  await startCreating(page);

  // Click an element on the host page to lock a selection. The canvas listens
  // on the window (capture phase), so a real click picks and locks the target.
  await page.locator("h1").click();

  await page.getByRole("button", { name: "Add alert details" }).click();

  // The form now reflects that only part of the page is being watched.
  await expect(page.getByRole("heading", { name: "Save alert" })).toBeVisible();
  await expect(page.getByText("part of the page")).toBeVisible();

  await page.getByRole("button", { name: "Save alert" }).click();

  await expect(page.getByText("Alert saved successfully!")).toBeVisible();
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
    await renderSignedIn(context, page, serviceWorker);
    await startCreating(page);

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });

  test("SaveAlert (details form) has no WCAG A/AA violations", async ({
    context,
    page,
    serviceWorker,
  }, testInfo) => {
    await renderSignedIn(context, page, serviceWorker);
    await startCreating(page);
    await page.getByRole("button", { name: "Add alert details" }).click();
    await expect(
      page.getByRole("heading", { name: "Save alert" }),
    ).toBeVisible();

    const { violations } = await scanSidebar(page, testInfo);
    expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
