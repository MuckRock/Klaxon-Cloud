# Klaxon Browser Extension

An evolution of the existing Klaxon bookmarklet, for the modern internet browser. Built with Svelte 5 and Vite, packaged as a Chrome Extension (Manifest V3).

When activated, Klaxon injects a sidebar into the current page. Hover over elements to highlight them, click to lock a selection, and the sidebar displays the CSS selector and matched text.

## Development

```sh
npm install
cp .env.example .env    # fill in MUCKROCK_CLIENT_ID from Squarelet admin
npm run dev             # builds to build/ with file watching
```

Env vars (`MUCKROCK_*`) are baked into the bundle at build start — **restart
`npm run dev` after editing `.env`**, since vite only reads env files once at
startup and will otherwise keep rebuilding with stale values.

## Building

```sh
npm run build
```

This produces a `build/` directory containing the extension files.

## Testing in Chrome

1. Run `npm run build`
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `build/` directory
5. Navigate to any webpage and click the Klaxon icon in the toolbar
6. The sidebar should appear on the right side of the page
7. Hover over elements to see them highlighted; click to lock a selection

## Registering an OAuth redirect URI

Sign-in uses the browser's `identity.launchWebAuthFlow`, which returns to a
browser-generated URL that must be registered exactly on the Squarelet OIDC
client (django-oidc-provider does exact-string matching).

To get the URI:

1. Load the extension (`chrome://extensions` → "Load unpacked" → `build/`).
2. Click the blue **service worker** link on the extension card to open its
   DevTools.
3. In the console, look for `[klaxon] OAuth redirect URI:` logged on SW boot,
   or run `chrome.identity.getRedirectURL()` — same result.
4. Copy the full URL (e.g. `https://<extension-id>.chromiumapp.org/`,
   **including the trailing slash**) into the Squarelet client's `Redirect
URIs` field, one per line.

The extension ID is stable across reloads thanks to the `"key"` in
`manifest.json`, so you only need to register once per client.

Firefox uses a per-profile UUID rather than the extension's `gecko.id`, so
each dev install needs its own registration; see
[plans/auth.md](../plans/auth.md) for the longer-term Firefox strategy.
