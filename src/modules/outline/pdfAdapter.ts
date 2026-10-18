import { geometryViewport, readPageGeometries } from "./pageGeometry";
import { outlineJob } from "./background";
import type {
  OutlinePDFDocument,
  OutlinePDFPage,
  TextItem,
} from "./recognitionAgent";

async function readTextPages(buf: ArrayBuffer): Promise<unknown[]> {
  const worker = new Worker(
    "chrome://jasminum/content/scripts/pdf-render-worker.js",
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error("PDF text read timed out")),
        120000,
      );
      worker.onerror = (event) => reject(new Error(event.message));
      worker.onmessageerror = () =>
        reject(new Error("Invalid PDF text response"));
      worker.onmessage = (event) => {
        const data = (event as MessageEvent).data;
        if (data.error) reject(new Error(data.error));
        else if (Array.isArray(data.textPages)) resolve(data.textPages);
      };
      worker.postMessage({ action: "text", buf }, [buf]);
    });
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}

/** Recognizer words use top-left coordinates; convert back to PDF coordinates. */
export function textItemsFromRecognizer(
  page: unknown,
  top: number,
): TextItem[] {
  const items: TextItem[] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length === 14 &&
      typeof value[13] === "string" &&
      value.slice(0, 4).every(Number.isFinite)
    ) {
      items.push({
        str: value[13],
        transform: [1, 0, 0, 0, value[0], top - value[1]],
      });
    } else value.forEach(visit);
  };
  visit(page);
  return items;
}

export async function adaptOutlinePDFDocument(
  filePath: string,
): Promise<OutlinePDFDocument> {
  const pages = await readPageGeometries(filePath);
  let cachedStart = -1;
  let batch: Promise<unknown[]>;
  return {
    numPages: pages.length,
    async getPage(pageNumber): Promise<OutlinePDFPage> {
      if (!Number.isInteger(pageNumber) || !pages[pageNumber - 1])
        throw new Error("Invalid PDF page number");
      const geometry = pages[pageNumber - 1];
      return {
        getViewport: () => geometryViewport(geometry),
        async getTextContent() {
          const start = Math.floor((pageNumber - 1) / 5) * 5;
          if (cachedStart !== start) {
            cachedStart = start;
            const pageIndexes = Array.from(
              { length: Math.min(5, pages.length - start) },
              (_, i) => start + i,
            );
            batch = outlineJob<ArrayBuffer>("textPDF", filePath, {
              pageIndexes,
            }).then(readTextPages);
          }
          const results = await batch;
          return {
            items: textItemsFromRecognizer(
              results[pageNumber - 1 - start],
              geometry.y + geometry.height,
            ),
          };
        },
      };
    },
  };
}
