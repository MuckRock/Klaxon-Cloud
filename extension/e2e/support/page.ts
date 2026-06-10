// A throwaway page for the content script to inject into. It must be an
// http(s) URL so it matches the extension's host_permissions (http://*/*,
// https://*/*) — the request is fulfilled by context.route in the test, so the
// .test TLD never actually resolves. getCanonicalURL() will read this as the
// monitored `site`, which the mocked API ignores.
export const TEST_PAGE_URL = "https://klaxon.test/";

export const TEST_PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Klaxon e2e test page</title>
  </head>
  <body>
    <h1>Klaxon e2e test page</h1>
  </body>
</html>`;
