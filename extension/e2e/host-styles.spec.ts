import { expect, test } from "./fixtures";
import { renderSignedOut } from "./support/render";

// Regression test for the host page collapsing the on-page Canvas overlay.
//
// The sidebar UI no longer lives in the page — it's the native side panel. What
// remains injected into the host page is the Canvas overlay: #klaxon-host, a
// <div> whose only content is an (open) shadow root holding the picker overlays.
// Shadow content isn't a light-DOM child, so to the host page the div looks
// :empty. Sites that ship `div:empty { display: none }` (e.g. the real-world
// repro https://suayla.com/pages/community-dye-bath) would therefore hide
// #klaxon-host — and the overlay inside it. page.svelte.ts defends the host with
// an inline `display: block` so a page rule like this can't collapse it.

test("host-page `div:empty` rule can't hide the Canvas overlay host", async ({
  context,
  page,
  serviceWorker,
}) => {
  // The CanvasClient injects page.js into the active tab on connect (to read the
  // page's canonical URL), so #klaxon-host appears without entering a flow.
  await renderSignedOut(context, page, serviceWorker);
  await page.waitForSelector("#klaxon-host", { state: "attached" });

  const displayBefore = await page.evaluate(
    () => getComputedStyle(document.getElementById("klaxon-host")!).display,
  );
  expect(displayBefore).toBe("block");

  // Drop in the hostile rule exactly as a host page's stylesheet would. No
  // !important: the extension only has to out-specify a plain rule, which the
  // inline `display: block` on the host does — the realistic threat.
  await page.addStyleTag({ content: "div:empty { display: none; }" });

  // The host still has no light-DOM children, so it keeps matching :empty. If
  // the rule collapsed #klaxon-host, its shadow tree would stop rendering and
  // the overlay would go with it. The inline style must keep it displayed.
  const displayAfter = await page.evaluate(
    () => getComputedStyle(document.getElementById("klaxon-host")!).display,
  );
  expect(displayAfter).toBe("block");
});
