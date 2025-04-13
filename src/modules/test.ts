const worker = new Worker("chrome://jasminum/content/jasminum-worker.js");
worker.addEventListener("message", (event) => {
  // @ts-ignore - event.data is not typed
  const data = event.data;
  ztoolkit.log("data", data);
  if (data && data.action === "test") {
    ztoolkit.log(data.status);
    ztoolkit.log(data.result);
  }
});

export async function test() {
  ztoolkit.log("Running test");
  return new Promise((resolve) => {
    const jobID = Zotero.Utilities.randomString();
    const item = Zotero.getActiveZoteroPane().getSelectedItems()[0];
    const title = item.getField("title");
    worker.postMessage({ action: "test", jobID, title });
    worker.addEventListener("message", function handler(event) {
      // @ts-ignore - event.data is not typed
      ztoolkit.log(event.data);
      worker.removeEventListener("message", handler);
    });
  });
}
