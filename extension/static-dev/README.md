# static-dev/ — dev build asset overlay

Files here replace the same-named files from [`../static/`](../static/), but **only
in a dev build** (`npm run dev`, or any build with `DEV_BUILD=true`). Shipped
builds — `npm run build`, `build:chrome`, `build:firefox`, and the e2e build —
never copy this directory, so nothing in it can leak into a store upload.

It exists so a locally built extension is tellable apart from the one installed
from the store: the dev manifest already suffixes every visible label with
`(dev)`, and these are the matching icons.

Drop in whichever of the manifest's three icons you want to override:

| File           | Where it shows                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| `icon-16.png`  | 16×16 — favicon-scale chrome                                                    |
| `icon-48.png`  | 48×48 — the `chrome://extensions` row                                           |
| `icon-128.png` | 128×128 — the toolbar button (`action.default_icon`) and Firefox's sidebar icon |

A partial overlay is fine: any icon you don't provide falls through to the shared one in `static/`. With the directory empty, a dev build is distinguished by name alone.

Two things to know:

- **Keep the filenames identical.** The overlay is matched by name — the manifest paths are never rewritten, which is what keeps prod builds untouched.
- **`*.png` here is Git LFS**, per the repo-root `.gitattributes`. A checkout
  without LFS objects leaves pointer text under these names and the dev build
  will copy it through as an unreadable icon (same trap as
  [`../static/`](../static/) — see the extension README).

The copy itself is the `klaxon-dev-assets` plugin in
[`../vite/page.config.ts`](../vite/page.config.ts).
