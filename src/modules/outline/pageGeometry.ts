export interface PageGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export function geometryViewport(page: PageGeometry) {
  const { x, y, width: w, height: h, rotation: r } = page;
  if (
    ![x, y, w, h, r].every(Number.isFinite) ||
    w <= 0 ||
    h <= 0 ||
    ![0, 90, 180, 270].includes(r)
  )
    throw new Error("Invalid PDF page geometry");
  const width = r === 90 || r === 270 ? h : w;
  const height = r === 90 || r === 270 ? w : h;
  return {
    width,
    height,
    convertToPdfPoint(px: number, py: number) {
      const left = px / width,
        top = py / height;
      switch (r) {
        case 90:
          return [x + top * w, y + left * h];
        case 180:
          return [x + (1 - left) * w, y + top * h];
        case 270:
          return [x + (1 - top) * w, y + (1 - left) * h];
        default:
          return [x + left * w, y + (1 - top) * h];
      }
    },
  };
}

export async function readPageGeometries(
  filePath: string,
): Promise<PageGeometry[]> {
  const worker = new Worker(
    "chrome://jasminum/content/scripts/jasminum-worker.js",
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error("PDF geometry read timed out")),
        120000,
      );
      worker.onerror = (e) => reject(new Error(e.message));
      worker.onmessageerror = () =>
        reject(new Error("Invalid PDF geometry response"));
      worker.onmessage = (event) => {
        const data = (event as MessageEvent).data;
        if (data?.action !== "pageGeometryReturn") return;
        if (data.status !== "success") {
          reject(new Error(data.error));
          return;
        }
        try {
          if (!Array.isArray(data.pages) || !data.pages.length)
            throw new Error("PDF has no pages");
          data.pages.forEach(geometryViewport);
          resolve(data.pages);
        } catch (error) {
          reject(error);
        }
      };
      worker.postMessage({ action: "pageGeometry", filePath });
    });
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}
