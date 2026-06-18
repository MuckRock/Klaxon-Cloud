import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { renderSignedIn } from "./support/render";

// CSS isolation for the on-page Canvas overlay.
//
// The sidebar UI is now its own document (the native side panel), so the host
// page can't reach it at all. What still lives in the page is the Canvas
// overlay, inside an open shadow root on #klaxon-host. canvas.svelte.ts styles
// those overlays with literal inline values (the brand red #e1275f, hardcoded
// dim/outline colors) precisely so page styles can't reach them — neither page
// stylesheets (shadow DOM blocks page selectors from matching shadow content,
// even with !important) nor inherited custom properties (the overlays use no
// var()s, so support/test-page.html's poison :root tokens can't bleed in).
//
// This spec locks a real selection, then assaults the host page with both
// vectors and asserts the overlay keeps its own brand styling.

const BRAND_RED = "rgb(225, 39, 95)"; // #e1275f

/**
 * Read the overlay's brand-styled surfaces from the shadow root: the locked
 * selection outline (the 4px solid box) and the dismiss button's background.
 * Both are written as literal #e1275f in canvas.svelte.ts.
 */
function readOverlayBrand(page: Page) {
  return page.evaluate(() => {
    const shadow = document.getElementById("klaxon-host")!.shadowRoot!;
    const divs = Array.from(shadow.querySelectorAll("div"));
    // The selection box is the only 4px-outlined div (see canvas.svelte.ts).
    const selection = divs.find(
      (d) => getComputedStyle(d).outlineWidth === "4px",
    );
    const dismiss = shadow.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear selection"]',
    );
    return {
      selectionOutline: selection
        ? getComputedStyle(selection).outlineColor
        : "(no selection box)",
      dismissBackground: dismiss
        ? getComputedStyle(dismiss).backgroundColor
        : "(no dismiss button)",
    };
  });
}

test("host-page CSS can't leak into the Canvas overlay", async ({
  context,
  page,
  serviceWorker,
}) => {
  const { panel } = await renderSignedIn(context, page, serviceWorker);

  // Lock a selection so the overlay (selection box + dismiss button) renders.
  await panel.getByRole("button", { name: "Create a new alert" }).click();
  await expect(
    panel.getByRole("heading", { name: "Create an alert" }),
  ).toBeVisible();
  await page.locator("h1").click();

  // Baseline: the overlay carries its own brand styling. (support/test-page.html
  // already poisons the design tokens on :root — if inherited custom properties
  // could reach the overlay, these would already be wrong here.)
  const before = await readOverlayBrand(page);
  expect(before.selectionOutline).toBe(BRAND_RED);
  expect(before.dismissBackground).toBe(BRAND_RED);

  // Now attack with page stylesheets, including !important, targeting the same
  // element types the overlay uses. Shadow DOM blocks these from matching the
  // overlay's nodes, so they must not change anything above.
  await page.addStyleTag({
    content: `
      div, button {
        outline-color: lime !important;
        background-color: lime !important;
        border-color: lime !important;
      }
    `,
  });

  const after = await readOverlayBrand(page);
  expect(
    after.selectionOutline,
    "host-page CSS leaked into the overlay's selection outline",
  ).toBe(BRAND_RED);
  expect(
    after.dismissBackground,
    "host-page CSS leaked into the overlay's dismiss button",
  ).toBe(BRAND_RED);
});
