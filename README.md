# Klaxon Browser Extension

An evolution of the existing Klaxon bookmarklet, for the modern internet browser. Built with Svelte 5 and Vite, packaged as a Chrome Extension (Manifest V3).

When activated, Klaxon injects a sidebar into the current page. Hover over elements to highlight them, click to lock a selection, and the sidebar displays the CSS selector and matched text.

## Development

```sh
npm install
npm run dev    # builds to build/ with file watching
```

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
