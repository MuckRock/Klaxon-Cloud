// Run a real `$effect` from a plain test file.
// =====
// `$effect` only compiles inside a component or a `.svelte.ts` module, so a
// `*.test.ts` can't declare one directly — hence this helper. It exists so a test
// can mount a view's effect *verbatim* and observe what the effect's own
// dependencies make it do (see issue #94: an effect that re-ran because the
// navigation it started wrote state it had read). Note the filename: `include`
// in vitest.config.ts only collects `*.test.ts`, so this isn't picked up as a
// suite of its own.
// =====

/**
 * Mount `fn` as an effect in its own root and return the teardown. The effect
 * runs on the next flush (as it would in a component), so callers should await a
 * macrotask before asserting; `fn`'s return value is honoured as the effect's
 * cleanup, exactly as in a component.
 */
export function mountEffect(fn: () => void | (() => void)): () => void {
  return $effect.root(() => {
    $effect(fn);
  });
}
