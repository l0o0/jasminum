import { test, addOutlineToPDF } from "./outline";

self.onmessage = async (e) => {
  console.log("Minimal Worker收到:", e.data);
  const data = e.data;
  if (data && data.action === "test") {
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
