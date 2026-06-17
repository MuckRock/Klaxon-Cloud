# Klaxon Browser Extension

An evolution of the existing Klaxon bookmarklet, for the modern internet browser. Built with Svelte 5 and Vite, packaged as a Chrome/Firefox extension (Manifest V3).

When activated, Klaxon injects a sidebar into the current page. Hover over elements to highlight them, click to lock a selection, and the sidebar displays the CSS selector and matched text.

## Development

```sh
npm ci
cp .env.example .env    # fill in MUCKROCK_CLIENT_ID from Squarelet admin
```

Dev is two separate watch builds that both emit into `build/<browser>/` (a content script and a service worker), so run them in two terminals:

```sh
npm run dev:content     # content script → build/chrome/content.js
npm run dev:service     # service worker → build/chrome/background.js
```

Both watchers default to the Chrome build (`build/chrome/`). To develop against
Firefox instead, set `BROWSER=firefox` for both (e.g. `BROWSER=firefox npm run
dev:content`), which emits into `build/firefox/`.

Environment variables (`MUCKROCK_*`) are baked into the bundle at build start — **restart both watchers after editing `.env`**, since vite only reads env files once at startup and will otherwise keep rebuilding with stale values. After a rebuild, reload the extension at `chrome://extensions`.

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

## Testing in Chrome

1. Run `npm run build` (or `npm run build:chrome`)
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `build/chrome/` directory
5. Navigate to any webpage and click the Klaxon icon in the toolbar
6. The sidebar should appear on the right side of the page
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
