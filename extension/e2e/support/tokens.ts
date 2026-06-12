import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type AST, parse } from "svelte/compiler";

const here = dirname(fileURLToPath(import.meta.url));
// e2e/support -> e2e -> extension
const APP_SVELTE = resolve(
  here,
  "..",
  "..",
  "src",
  "lib",
  "components",
  "App.svelte",
);

/**
 * The Klaxon design-token names declared on `:host` in App.svelte, parsed from
 * source via the Svelte compiler. css-leaks.spec.ts derives its token list
 * from this so the test stays in sync automatically: add a token to `:host`
 * and the leak test starts guarding it (and its sanity check then demands a
 * poison value for it in support/test-page.html).
 *
 * Uses the real CSS AST rather than a regex so it's not fooled by comments,
 * nested rules, or `:host(...)` selector variants. Tied to Svelte 5's
 * `parse({ modern: true })` AST shape.
 */
export function hostTokenNames(): string[] {
  const source = readFileSync(APP_SVELTE, "utf8");
  const { css } = parse(source, { modern: true, filename: "App.svelte" });
  if (!css) throw new Error("App.svelte has no <style> block");

  const names = css.children
    .filter((node): node is AST.CSS.Rule => node.type === "Rule")
    .filter(
      (rule) =>
        source.slice(rule.prelude.start, rule.prelude.end).trim() === ":host",
    )
    .flatMap((rule) => rule.block.children)
    .filter((node): node is AST.CSS.Declaration => node.type === "Declaration")
    .map((decl) => decl.property)
    .filter((property) => property.startsWith("--"));

  if (names.length === 0) {
    throw new Error("no custom properties found on :host in App.svelte");
  }
  return [...new Set(names)];
}
