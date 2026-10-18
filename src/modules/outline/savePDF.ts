/** Shared PDF writer used by the sidebar and AI outline review. */
export async function writePDFOutline(
  item: Zotero.Item,
  outlineNodes: OutlineNode[],
): Promise<void> {
  const filePath = await item.getFilePathAsync();
  if (!filePath) throw new Error("PDF file is missing");
  const worker = new Worker(
    "chrome://jasminum/content/scripts/jasminum-worker.js",
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const jobID = Zotero.Utilities.randomString();
      worker.onmessage = (event: Event) => {
        const data = (event as MessageEvent).data;
        if (data?.action !== "addOutlineReturn" || data?.jobID !== jobID)
          return;
        if (data.status === "success") resolve();
        else reject(new Error(data.error || "Failed to save PDF outline"));
      };
      worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        reject(new Error(event.message || "PDF worker failed"));
      };
      worker.onmessageerror = () =>
        reject(new Error("Invalid PDF worker response"));
      worker.postMessage({
        action: "addOutline",
        jobID,
        filePath,
        outlineNodes,
      });
    });
  } finally {
    worker.terminate();
  }
}
