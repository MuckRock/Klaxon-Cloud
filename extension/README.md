# Klaxon Browser Extension

An evolution of the existing Klaxon bookmarklet, for the modern internet browser. Built with Svelte 5 and Vite, packaged as a Chrome/Firefox extension (Manifest V3).

When activated, Klaxon opens the browser's native sidebar (Chrome side panel / Firefox sidebar). To pick what to watch it injects a Canvas content script into the current page: hover over elements to highlight them, click to lock a selection, and the panel displays the CSS selector and matched text.

## Development

```sh
npm ci
cp .env.example .env    # fill in MUCKROCK_CLIENT_ID from Squarelet admin
```

Dev is three watch builds emitting into `build/<browser>/` (the Canvas content script, the side panel, and the service worker). Run them all at once:

```sh
npm run dev             # clean once, then all three watchers in parallel
```

…or run them individually in separate terminals: `npm run dev:page`,
`npm run dev:sidepanel`, `npm run dev:service`.

All builds default to Chrome (`build/chrome/`). To develop against Firefox
instead, set `BROWSER=firefox` (e.g. `BROWSER=firefox npm run dev`), which emits
into `build/firefox/`.

### Telling a dev build from the installed one

A dev build and the extension you installed from the store can both be loaded at
once, which makes it guesswork which toolbar button or `chrome://extensions` row
belongs to which. So `npm run dev` (anything with `DEV_BUILD=true`, set by
`dev:page`) marks its output:

- every user-visible label gets a **`(dev)`** suffix — the name, the toolbar button's hover title, and Firefox's sidebar title;
- any icon you put in **[`static-dev/`](static-dev/)** replaces the same-named one from `static/`. See that directory's README; a partial overlay is fine, and with it empty the name suffix stands on its own.

`npm run build`, `build:chrome`, `build:firefox`, and the e2e build never set the flag, so shipped output keeps the real name and icons.

Environment variables (`MUCKROCK_*`) are baked into the bundle at build start — **restart the watchers after editing `.env`**, since vite only reads env files once at startup and will otherwise keep rebuilding with stale values. After a rebuild, reload the extension at `chrome://extensions`.

The two that need real values (the rest default to the dev environment in `.env.example`):

- `MUCKROCK_CLIENT_ID` — Squarelet OIDC public client; sign-in throws without it.
- `MUCKROCK_KLAXON_ID` — the Klaxon add-on's numeric ID in DocumentCloud; the API calls filter on it, and it changes between environments.

`MUCKROCK_ACCOUNTS_HOST`, `MUCKROCK_DOCUMENTCLOUD_API`, and `MUCKROCK_SCOPES`
already point at dev defaults. The client is public (PKCE), so there's no secret.

## Building

```sh
npm run build           # both browsers
npm run build:chrome    # just build/chrome/
npm run build:firefox   # just build/firefox/
```

`npm run build` produces `build/chrome/` and `build/firefox/` directories, each
containing a self-contained extension with a manifest tailored to that browser.
Chrome and Firefox disagree on a few manifest keys (background type, the
Chrome-only `key`, Firefox-only `browser_specific_settings`), so shipping a
single shared manifest makes each browser warn about the other's keys.

Two gotchas bite at store-upload time, not build time — see
[Releasing the extension](../README.md#releasing-the-extension) in the root
README before you upload anything:

- **Bump the version** with `npm run bump -- <minor|patch|major|x.y.z>`. It lives
  only in `manifest/base.json`, it isn't semver (`1.1` is a valid two-part
  version), and the store rejects any upload that doesn't increase it.
- **Icons and fonts are Git LFS objects.** Without the LFS objects fetched
  they're pointer text files, the build still succeeds, and the store rejects the
  zip with "icon-128.png could not be processed". Verify with
  `file build/chrome/icon-128.png` — it must say `PNG image data`.

## Testing in Chrome

1. Run `npm run build` (or `npm run build:chrome`)
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `build/chrome/` directory
5. Navigate to any webpage and click the Klaxon icon in the toolbar
6. The side panel should open; choose **Create a new alert** to start picking
7. Hover over elements to see them highlighted; click to lock a selection

### End-to-end tests

We use Playwright for browser and accessibility testing. Before running these tests, make sure Playwright is installed:

```sh
npx playwright install --with-deps chromium
```

Then run the tests:

```sh
# headless
npm run test:e2e

# with a browser
npm run test:e2e:headed
```

## Registering an OAuth redirect URI

Sign-in uses the browser's `identity.launchWebAuthFlow`, which returns to a
browser-generated URL that must be registered exactly on the Squarelet OIDC
client (`django-oidc-provider` does exact-string matching).

Both browsers derive the URL from the (pinned) extension ID, so both are
stable across reloads, profiles, and machines — register **both** of these on
the Squarelet client's `Redirect URIs` field (one per line, **including the
trailing slash**). Run `npm run redirect-uris` to print them (it computes them
from the per-browser manifests in `manifest/`):

```
https://noigegfnnlepflfmiajbpdhpgjgmiikc.chromiumapp.org/
https://42386841672e9751ac81498187b4242b2e7d8fde.extensions.allizom.org/
```

- **Chrome** ID is pinned by the `"key"` in `manifest/chrome.json` (a
  SHA-256-derived hash of the key).
- **Firefox** uses `https://<SHA-1(gecko.id)>.extensions.allizom.org/`, where
  `gecko.id` is `klaxon-cloud@muckrock.com` from `browser_specific_settings` in
  `manifest/firefox.json`. This is stable _because_ `gecko.id` is set;
  without it, a temporary install gets a random ID and thus a different URL.

To confirm the values, load the extension and check `[klaxon] OAuth redirect
URI:` logged on SW boot (or run `chrome.identity.getRedirectURL()` in the
service worker console).
