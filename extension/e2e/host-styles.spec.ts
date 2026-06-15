import { expect, test } from "./fixtures";
import { renderSignedOut } from "./support/render";

// Regression test for the host page collapsing the whole extension.
//
// #klaxon-host is a <div> whose only content is an (open) shadow root. Shadow
// content isn't a light-DOM child, so to the host page the div looks :empty.
// Sites that ship `div:empty { display: none }` (e.g. the real-world repro
// https://suayla.com/pages/community-dye-bath) therefore hide #klaxon-host —
// and the sidebar inside it — entirely. The extension must defend its host
// element so a page rule like this can't collapse it.

test("host-page `div:empty` rule can't hide the sidebar", async ({
  page,
  serviceWorker,
}) => {
  await renderSignedOut(page, serviceWorker);
  await expect(page.locator(".sidebar")).toBeVisible();

  // Drop in the hostile rule exactly as a host page's stylesheet would. No
  // !important: the extension only has to out-specify a plain rule (an inline
  // style on the host is enough), which is the realistic threat.
  await page.addStyleTag({ content: "div:empty { display: none; }" });

  // The host still has no light-DOM children, so it keeps matching :empty. If
  // the rule collapses #klaxon-host, its shadow tree stops rendering and the
  // sidebar goes with it. (We assert on the sidebar, not #klaxon-host itself:
  // the host is a zero-size container around a fixed-position sidebar, so
  // Playwright always reports it "hidden" regardless of this rule.)
  await expect(page.locator(".sidebar")).toBeVisible();
});
