# Klaxon Cloud — internal test build

This zip contains an **unsigned, pre-release** build of the Klaxon Cloud browser
extension for internal testing. It is not from the Chrome Web Store or Firefox
Add-ons, so you load it manually as an unpacked / temporary extension.

Inside this zip (everything is at the top level): `manifest.json` and the
extension's files, this `INSTALL.md`, and a `BUILD-INFO.txt` noting which commit
it was built from. **The unzipped folder itself is what you point the browser
at.**

Unzip it somewhere you'll remember (e.g. your Desktop) before starting.

## Chrome / Edge / Brave (any Chromium browser)

1. Go to `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Turn on **Developer mode** (toggle, top-right).
3. Click **Load unpacked**.
4. Select the unzipped folder (the one containing `manifest.json`) and click
   **Select**.
5. The Klaxon Cloud icon appears in the toolbar. Pin it if you like.
6. Open any web page and click the icon — the sidebar slides in from the right.
   Hover elements to highlight, click to lock a selection.

The extension stays installed across restarts. To update to a newer test build,
replace the folder's contents and click the **reload** ↻ icon on the extension's
card at `chrome://extensions`.

## Firefox

Firefox loads unsigned extensions only as **temporary** add-ons, which are
removed when you quit Firefox. You'll re-load it each session.

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Open the unzipped folder and select **`manifest.json`**.
4. The extension loads and its icon appears in the toolbar. Click it on any page
   to open the sidebar.

To reload after quitting Firefox, repeat the steps above. (Optional: use
[Firefox Developer Edition](https://www.mozilla.org/firefox/developer/) or set
`xpinstall.signatures.required` to `false` in `about:config` on Developer/Nightly
builds to keep it installed across restarts.)

## Signing in

This build points at the **dev** Squarelet / DocumentCloud environment. Sign in
with your dev-environment MuckRock account. If sign-in does nothing or errors,
the build's OAuth client may not be configured — flag it in the testing channel.

## Reporting issues

When something breaks, note your browser + version, the page URL, and grab any
errors from the console:

- **Chrome**: `chrome://extensions` → Klaxon Cloud → **Inspect views: service
  worker**, and the page's own DevTools console (F12) for the sidebar.
- **Firefox**: `about:debugging` → Klaxon Cloud → **Inspect**.
