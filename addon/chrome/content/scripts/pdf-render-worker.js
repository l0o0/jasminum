// Reuse Zotero's renderer, passing resource URLs directly. The built-in
// pdf.renderArea message handler drops these options on Zotero 10 beta.26.
importScripts("resource://zotero/document-worker/worker.js");

// PDF.js's resource loader and font loader expect a document even in a worker.
self.document = {
  baseURI: self.location.href,
  fonts: self.fonts,
  createElement(name) {
    if (name === "canvas") return new OffscreenCanvas(1, 1);
    throw new Error(`Unsupported PDF renderer element: ${name}`);
  },
};

self.onmessage = async ({ data }) => {
  try {
    const images = [];
    for (const pageIndex of data.pageIndexes) {
      const canvas = await self.worker.pdf.renderArea(
        data.buf.slice(0),
        pageIndex,
        [
          Number.MIN_SAFE_INTEGER,
          Number.MIN_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER,
        ],
        {
          scale: data.scale,
          password: data.password,
          cMapUrl: "resource://zotero/reader/pdf/web/cmaps/",
          standardFontDataUrl:
            "resource://zotero/reader/pdf/web/standard_fonts/",
          wasmUrl: "resource://zotero/document-worker/wasm/",
        },
      );
      if (!canvas)
        throw new Error(`Failed to render PDF page ${pageIndex + 1}`);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      images.push({ pageIndex, buf: await blob.arrayBuffer() });
    }
    self.postMessage(
      { images },
      images.map(({ buf }) => buf),
    );
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
