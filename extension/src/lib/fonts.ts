// Source Sans Pro is loaded via the FontFace API rather than a CSS @font-face
// rule because the sidebar lives inside a shadow root, and @font-face rules
// declared inside a shadow tree are ignored — fonts resolve at the document
// level. Registering the faces on the host page's `document.fonts` makes them
// available to the shadow DOM. The files ship as web-accessible resources
// (see manifest.json) so the content script can fetch them by extension URL.

const FACES: ReadonlyArray<{ file: string; weight: string }> = [
  { file: "fonts/SourceSansPro-Regular.woff2", weight: "400" },
  { file: "fonts/SourceSansPro-Semibold.woff2", weight: "600" },
  { file: "fonts/SourceSansPro-Bold.woff2", weight: "700" },
];

export async function loadFonts(): Promise<void> {
  if (!("fonts" in document)) return;

  await Promise.all(
    FACES.map(async ({ file, weight }) => {
      const url = chrome.runtime.getURL(file);
      const face = new FontFace(
        "Source Sans Pro",
        `url(${url}) format("woff2")`,
        {
          weight,
          style: "normal",
          display: "swap",
        },
      );
      try {
        await face.load();
        document.fonts.add(face);
      } catch (err) {
        console.debug("[klaxon fonts]", file, err);
      }
    }),
  );
}
