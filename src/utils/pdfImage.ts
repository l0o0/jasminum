interface RenderPDFPagesOptions {
  scale?: number;
  password?: string;
  isPriority?: boolean;
}

interface PDFPagePNG {
  pageIndex: number;
  data: Uint8Array;
  mimeType: "image/png";
}

interface PDFWorkerWithPageRenderer {
  getFullText(
    itemID: number,
    maxPages: number,
    isPriority?: boolean,
    password?: string,
  ): Promise<{ text: string }>;
  _enqueue<T>(task: () => Promise<T>, isPriority?: boolean): Promise<T>;
  getRecognizerData(
    itemID: number,
    isPriority?: boolean,
    password?: string,
  ): Promise<{ totalPages: number }>;
}

function assertZotero10() {
  const majorVersion = Number.parseInt(Zotero.version, 10);
  if (!Number.isFinite(majorVersion) || majorVersion < 10) {
    throw new Error("PDF page rendering requires Zotero 10 or later");
  }
}

function validatePageIndexes(pageIndexes: readonly number[]) {
  for (const pageIndex of pageIndexes) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) {
      throw new Error("PDF page indexes must be non-negative integers");
    }
  }
}

async function renderPDFPagesAsPNG(
  itemID: number,
  pageIndexes: readonly number[],
  options: RenderPDFPagesOptions = {},
): Promise<PDFPagePNG[]> {
  assertZotero10();
  validatePageIndexes(pageIndexes);
  if (!pageIndexes.length) {
    return [];
  }

  const scale = options.scale ?? 2;
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error("PDF render scale must be a positive number");
  }

  const attachment = await Zotero.Items.getAsync(itemID);
  if (!attachment?.isPDFAttachment()) {
    throw new Error("Item must be a PDF attachment");
  }
  const path = await attachment.getFilePathAsync();
  if (!path) {
    throw new Error("PDF attachment file is missing");
  }

  const worker = Zotero.PDFWorker as PDFWorkerWithPageRenderer;
  if (typeof worker._enqueue !== "function") {
    throw new Error("This Zotero version does not support PDF page rendering");
  }

  const images = await worker._enqueue(async () => {
    const source = await IOUtils.read(path);
    const renderer = new Worker(
      "chrome://jasminum/content/scripts/pdf-render-worker.js",
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await new Promise<PDFPagePNG[]>((resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(new Error("PDF page rendering timed out after 120 seconds")),
          120_000,
        );
        renderer.onerror = (event) => reject(new Error(event.message));
        renderer.onmessageerror = () =>
          reject(new Error("Invalid PDF renderer response"));
        renderer.onmessage = (event) => {
          const data = (
            event as MessageEvent<{
              error?: string;
              images: { pageIndex: number; buf: ArrayBuffer }[];
            }>
          ).data;
          // PDF.js also emits an internal worker-ready message.
          if (!data.error && !data.images) return;
          if (data.error) {
            reject(new Error(data.error));
            return;
          }
          resolve(
            data.images.map(({ pageIndex, buf }) => ({
              pageIndex,
              data: new Uint8Array(buf),
              mimeType: "image/png" as const,
            })),
          );
        };
        renderer.postMessage(
          {
            buf: source.buffer,
            pageIndexes: [...pageIndexes],
            scale,
            password: options.password,
          },
          [source.buffer],
        );
      });
    } finally {
      clearTimeout(timeout);
      renderer.terminate();
    }
  }, options.isPriority ?? true);

  // Temporary diagnostic copies of the exact PNG bytes sent to recognition.
  // Keep each run separate so repeated attempts can be compared.
  try {
    const directory = await IOUtils.createUniqueDirectory(
      PathUtils.tempDir,
      `jasminum-pdf-${attachment.key}-${Date.now()}`,
      0o700,
    );
    ztoolkit.log(`PDF screenshots: ${directory}`);
    for (const image of images) {
      await IOUtils.write(
        PathUtils.join(directory, `page-${image.pageIndex + 1}.png`),
        image.data,
      );
    }
  } catch (error) {
    // Saving diagnostics must not prevent metadata recognition.
    ztoolkit.log(
      "Failed to save PDF screenshots to temporary directory",
      error,
    );
  }
  return images;
}

async function renderFirstPDFPagesAsPNG(
  itemID: number,
  maxPages: number | "auto" = 3,
  options: RenderPDFPagesOptions = {},
): Promise<PDFPagePNG[]> {
  assertZotero10();
  if (maxPages !== "auto" && (!Number.isInteger(maxPages) || maxPages <= 0)) {
    throw new Error("PDF page count must be a positive integer");
  }

  const worker = Zotero.PDFWorker as PDFWorkerWithPageRenderer;
  if (maxPages === "auto") {
    maxPages = 6;
    try {
      const { text } = await worker.getFullText(
        itemID,
        3,
        options.isPriority ?? true,
        options.password,
      );
      const compact = text.replace(/\s+/g, "");
      const readable = (compact.match(/[\p{L}\p{N}]/gu) ?? []).length;
      const isThesis =
        /(?:硕士|博士)(?:专业)?学位论文|(?:申请|攻读)(?:.{0,20})(?:硕士|博士)学位|(?:master['’]?s|doctoral|ph\.?d\.?)\s+(?:thesis|dissertation)|(?:thesis|dissertation)[\s\S]{0,200}(?:degree\s+of\s+(?:master|doctor))/i.test(
          text,
        ) || /(?:硕士|博士)(?:专业)?学位论文/.test(compact);
      if (
        !isThesis &&
        readable >= 20 &&
        readable / compact.length >= 0.5 &&
        !compact.includes("\uFFFD")
      ) {
        maxPages = 3;
      }
    } catch (error) {
      ztoolkit.log("PDF text precheck failed; using up to 6 pages", error);
    }
    ztoolkit.log(`PDF recognition page limit: ${maxPages}`);
  }
  if (typeof worker.getRecognizerData !== "function") {
    throw new Error("This Zotero version cannot determine the PDF page count");
  }
  const { totalPages } = await worker.getRecognizerData(
    itemID,
    options.isPriority ?? true,
    options.password,
  );
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    throw new Error("PDF does not contain any pages");
  }

  const pageIndexes = Array.from(
    { length: Math.min(maxPages, totalPages) },
    (_, index) => index,
  );
  return renderPDFPagesAsPNG(itemID, pageIndexes, options);
}

export { renderFirstPDFPagesAsPNG, renderPDFPagesAsPNG };
export type { PDFPagePNG, RenderPDFPagesOptions };
