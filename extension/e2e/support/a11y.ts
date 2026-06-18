import type { Page, TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.0/2.1 levels A and AA — the conventional baseline ruleset.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Run an axe-core accessibility scan over the sidebar UI, attach the full
 * report, log each offending element, and return the results.
 *
 * `panel` is the side-panel page (sidepanel.html), whose entire document *is*
 * our UI, so the scan is scoped to its `.sidebar` root. Call it once the UI has
 * rendered (e.g. after an `expect(...).toBeVisible()`), since axe scans a DOM
 * snapshot. Callers assert on the result, e.g.:
 *   const { violations } = await scanSidebar(panel, testInfo);
 *   expect(violations.map((v) => v.id)).toEqual([]);
 *
 * The per-element logging means a failing run names exactly what to fix without
 * having to open the attached report.
 */
export async function scanSidebar(panel: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page: panel })
    .include(".sidebar")
    .withTags(WCAG_TAGS)
    .analyze();

  await testInfo.attach("axe-results", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  for (const v of results.violations) {
    console.warn(`[a11y] ${testInfo.title}: ${v.id} (${v.impact}) — ${v.help}`);
    for (const node of v.nodes) {
      console.warn(`         ${node.target.join(" ")}`);
    }
  }

  return results;
}
