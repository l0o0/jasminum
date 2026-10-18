import {
  test,
  addOutlineToPDF,
  getPageGeometries,
  readNativeOutline,
  extractTextPDF,
} from "./outline";

self.onmessage = async (e) => {
  console.log("Minimal Worker收到:", e.data);
  const data = e.data;
  if (data?.action === "nativeOutline" || data?.action === "textPDF") {
    try {
      const result =
        data.action === "nativeOutline"
          ? await readNativeOutline(data.filePath)
          : await extractTextPDF(data.filePath, data.pageIndexes);
      self.postMessage({
        action: `${data.action}Return`,
        status: "success",
        result,
      });
    } catch (error) {
      self.postMessage({
        action: `${data.action}Return`,
        status: "error",
        error: String(error),
      });
    }
  } else if (data?.action === "pageGeometry") {
    try {
      const pages = await getPageGeometries(data.filePath);
      self.postMessage({
        action: "pageGeometryReturn",
        status: "success",
        pages,
      });
    } catch (error) {
      self.postMessage({
        action: "pageGeometryReturn",
        status: "error",
        error: String(error),
      });
    }
  } else if (data && data.action === "test") {
    const result = test(data.title);
    self.postMessage({
      action: "testReturn",
      jobID: data.jobID,
      status: "success",
      result,
    });
  } else if (data && data.action === "addOutline") {
    const { filePath, outlineNodes } = data;
    try {
      await addOutlineToPDF(filePath, outlineNodes);
      self.postMessage({
        action: "addOutlineReturn",
        jobID: data.jobID,
        status: "success",
      });
    } catch (error) {
      self.postMessage({
        action: "addOutlineReturn",
        jobID: data.jobID,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
