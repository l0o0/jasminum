const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks, globals) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (n) => mocks[n],
      btoa,
      Uint8Array,
      ArrayBuffer,
      Error,
      ...globals,
    },
  );
  return exports;
}
async function main() {
  let body,
    response = { text: "JASMINUM 4729 茉莉花", petalColor: "white" };
  const image = fs.readFileSync(
    "addon/chrome/content/icons/jasminum-vision-test.png",
  );
  assert.equal(image.subarray(1, 4).toString(), "PNG");
  const Zotero = {
    HTTP: {
      request: async (method, url, options) => {
        if (method === "GET") {
          assert.equal(
            url,
            "chrome://jasminum/content/icons/jasminum-vision-test.png",
          );
          assert.equal(options.responseType, "arraybuffer");
          assert.deepEqual(Array.from(options.successCodes), [0, 200]);
          return { status: 0, response: new Uint8Array(image).buffer };
        }
        assert.equal(method, "POST");
        assert.equal(url, "https://example.test/v1/chat/completions");
        body = JSON.parse(options.body);
        return {
          responseText: JSON.stringify({
            choices: [{ message: { content: JSON.stringify(response) } }],
          }),
        };
      },
    },
  };
  const { OpenAIClient } = load(
    "src/utils/llm.ts",
    {
      "./prompts": { PDF_METADATA_FIELD_DESCRIPTIONS: {} },
      "./prefs": {},
      "./locale": {},
    },
    { Zotero },
  );
  const { testImageConnection } = load(
    "src/modules/preferences/llmConnectionTest.ts",
    { "../../../package.json": { config: { addonRef: "jasminum" } } },
    { Zotero },
  );
  const client = new OpenAIClient({
    baseURL: "https://example.test/v1",
    apiKey: "test",
    model: "vision-test",
  });
  assert.equal(await testImageConnection(client), true);
  const user = body.messages[1].content;
  assert.equal(user[1].type, "image_url");
  assert.equal(user[1].image_url.detail, "low");
  assert.equal(
    user[1].image_url.url,
    `data:image/png;base64,${image.toString("base64")}`,
  );
  assert(!body.messages[0].content.includes("4729"));
  assert(!user[0].text.includes("4729"));
  response = { text: "jasminum\n4729\n茉莉花", petalColor: " White " };
  assert.equal(await testImageConnection(client), true);
  response = { text: "JASMINUM 4729 茉莉花", petalColor: "blue" };
  assert.equal(await testImageConnection(client), false);
  assert(!body.messages[0].content.includes("茉莉花"));
  assert(!user[0].text.includes("茉莉花"));
  for (const text of [
    "JASMINUM 4729",
    "JASMINUM 4729 茉",
    "JASMINUM 4729 茉利花",
  ]) {
    response = { text, petalColor: "white" };
    assert.equal(await testImageConnection(client), false);
  }
  response = { text: "", petalColor: "" };
  assert.equal(await testImageConnection(client), false);
  response = { ok: true };
  await assert.rejects(testImageConnection(client), /missing field/);
  let called = false;
  Zotero.HTTP.request = async () => ({
    status: 0,
    response: new ArrayBuffer(0),
  });
  await assert.rejects(
    testImageConnection({
      createJSONCompletion: async () => {
        called = true;
      },
    }),
    /test image/,
  );
  assert.equal(called, false);
  // Cancellation rejects promptly even if Zotero's abort leaves its promise pending.
  let aborted = 0;
  Zotero.HTTP.request = async (_method, _url, options) => {
    options.requestObserver({ abort: () => aborted++ });
    return new Promise(() => {});
  };
  const controller = new AbortController();
  const pending = client.createJSONCompletion({
    signal: controller.signal,
    systemPrompt: "test",
    prompt: "test",
    responseFormat: {
      name: "test",
      schema: { type: "object", properties: {} },
    },
  });
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.equal(aborted, 1);
  await assert.rejects(
    client.createJSONCompletion({
      signal: controller.signal,
      responseFormat: { schema: {} },
    }),
    /cancelled/,
  );
  assert.equal(aborted, 1);
  console.log("Image connection tests passed");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
