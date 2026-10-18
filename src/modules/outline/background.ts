/** Read-only jobs; each worker is released on success, error or timeout. */
export async function outlineJob<T>(
  action: string,
  filePath: string,
  extra = {},
): Promise<T> {
  const worker = new Worker(
    "chrome://jasminum/content/scripts/jasminum-worker.js",
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("PDF read timed out")), 120000);
      worker.onerror = (event) => reject(new Error(event.message));
      worker.onmessageerror = () => reject(new Error("Invalid PDF response"));
      worker.onmessage = (event) => {
        const data = (event as MessageEvent).data;
        if (data?.action !== `${action}Return`) return;
        if (data.status === "success") resolve(data.result);
        else reject(new Error(data.error));
      };
      worker.postMessage({ action, filePath, ...extra });
    });
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}
