import { test } from "./outline";

addEventListener("message", async (event) => {
  if (event.data && event.data.action === "test") {
    const title = event.data.title;
    const result = test(title);
    postMessage({
      action: "test",
      status: "success",
      result: result,
    });
  }
});
