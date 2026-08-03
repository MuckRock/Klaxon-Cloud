# Klaxon Cloud

Klaxon monitors web pages for newsworthy changes. Pick a page — or just part of one — choose how often to check it, and Klaxon notifies you when it changes, backing each detected change with an Internet Archive snapshot and a visual diff.

This monorepo holds the two user-facing front ends (a browser extension and a web app) plus the code they share. The scheduling and storage live elsewhere: alerts are DocumentCloud **Add-On Events**, and each check is an **Add-On Run** executed by the [`MuckRock/Klaxon`](https://github.com/MuckRock/Klaxon) Add-On script in GitHub Actions. [`docs/`](docs/) maps the whole system end to end — start with [docs/architecture.md](docs/architecture.md), and read [docs/README.md](docs/README.md#terminology-the-two-vocabularies) for the alert/event and change/run vocabulary that the rest of the docs assume.

## Layout

npm workspaces; one `npm ci` at the root installs everything and links `@klaxon/lib` into both front ends.

| Workspace                  | What it is                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`extension/`](extension/) | The Chrome/Firefox MV3 extension (Svelte 5 + Vite). Picks a page region in a native side panel. See [extension/README.md](extension/README.md). |
| [`site/`](site/)           | The SvelteKit web app on Cloudflare Workers. Same backend, but the OIDC handshake runs server-side. See [site/README.md](site/README.md).       |
| [`lib/`](lib/)             | `@klaxon/lib` — pure OIDC/API helpers, types, and shared Svelte components. Consumed by both.                                                   |
| [`docs/`](docs/)           | How the whole system works, across all four repos.                                                                                              |
| [`plans/`](plans/)         | Design docs for in-flight or completed work.                                                                                                    |

```sh
npm ci                                  # once, at the root
npm run build -w klaxon-browser-extension
npm run dev -w site
npm test -w @klaxon/lib
```

Each workspace's README covers its own setup, including the `.env` values and the OIDC client registration it needs.

## Releasing the extension

[`.github/workflows/package.yml`](.github/workflows/package.yml) runs on every push to `main`: it builds both browsers, attaches three zips to a dated GitHub release (`chrome` and `firefox` sideload builds, plus `chrome-webstore`), and it's the `chrome-webstore` zip that goes to the Chrome Web Store. The two zips differ by one key — sideload builds keep the `key` in `manifest/chrome.json` that pins the extension ID (so testers' registered OAuth redirect URI works), and the store rejects any manifest containing `key`, so that build is rebuilt with it stripped.

### The version must increase, and it isn't semver

`version` lives in exactly one place: [`extension/manifest/base.json`](extension/manifest/base.json). Neither per-browser overlay sets it, and the `version` fields in the various `package.json`s are unrelated npm boilerplate — don't bump those expecting anything to happen.

Bump it with the script, from `extension/`:

```sh
npm run bump -- minor       # 1.1 -> 1.2   (new features)
npm run bump -- patch       # 1.1 -> 1.1.1 (bugfixes on a shipped version)
npm run bump -- major       # 1.1 -> 2.0
npm run bump -- 1.4.2       # explicit
npm run bump -- minor --dry-run
```

Extension versions are **not semver**. Chrome accepts 1–4 dot-separated integers, each 0–65535, with no leading zeros — so the published `1.1` is a legitimate two-part version, and `1.01` is not a version at all. `patch` therefore _appends_ a third part (`1.1` → `1.1.1`) rather than assuming one exists.

The store also requires each upload to sort strictly above the published version.

`npm run bump` enforces all of that locally — it validates the range and leading-zero rules and refuses any bump that isn't a strict increase.

### Icons and fonts are Git LFS objects

`extension/static/*.png` and `extension/static/fonts/*.woff2` are tracked by Git LFS (see [`.gitattributes`](.gitattributes)). **A checkout that doesn't fetch LFS objects gets ~130-byte pointer text files under those names instead** — and since vite copies `publicDir` through untouched, the build succeeds, the zip looks complete, and every icon and font inside it is unreadable.

Two guards are in place for this: the workflow checks out with `lfs: true`, and a step after the build greps the output for the LFS pointer signature and fails the job if it finds one. Before any **manual** upload, confirm it yourself — this is the whole check:

```sh
file build/chrome/icon-128.png
# PNG image data, 128 x 128  ✅
# ASCII text                 ❌ LFS pointer; run `git lfs pull`
```

If you're cloning fresh to cut a build, `git lfs install` then `git lfs pull`.

### Checklist

1. `npm run bump -- minor` (or `patch`) in `extension/`, commit, push to `main`.
2. Let the Package workflow finish; download `klaxon-cloud-extension-chrome-webstore-<sha>.zip` from the release it creates.
3. `unzip -p …zip icon-128.png | file -` — must say PNG, not ASCII text.
4. Upload to the Chrome Web Store. The version in the zip's `manifest.json` must be higher than the published one.
