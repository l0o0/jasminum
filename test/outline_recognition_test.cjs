const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/modules/outline/recognitionAgent.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      require: (n) => mocks[n],
      Error,
      Zotero: { getMainWindow: () => ({ AbortController }) },
    },
  );
  return exports;
}
const json = (v) => JSON.parse(JSON.stringify(v));
async function main() {
  let calls = 0,
    renders = [],
    failPage = 6,
    cancelOnRender = false,
    invalid = false,
    cancelOnResponse = false,
    agent;
  const api = load({
    "../../utils/llm": {
      getConfiguredLLMClient: () => ({
        createJSONCompletion: async (options) => {
          calls++;
          const pages =
            options.responseFormat.schema.properties.pages.items.properties.page
              .enum;
          assert.equal(options.images.length, pages.length);
          assert(pages.length <= 5);
          if (pages.includes(failPage)) throw Error("network failure");
          if (cancelOnResponse) agent.stop();
          return {
            pages: pages
              .map((p) => ({
                page: invalid ? 99 : p,
                headings: [
                  {
                    title: `${p} Section`,
                    level: p === 1 ? 1 : 2,
                    left: 0.1,
                    top: 0.25,
                  },
                ],
              }))
              .reverse(),
          };
        },
      }),
    },
    "../../utils/pdfImage": {
      renderPDFPagesAsPNG: async (id, pages, options) => {
        assert.equal(id, 7);
        assert.equal(options.saveDiagnostics, false);
        renders.push(...pages);
        if (cancelOnRender) agent.stop();
        return pages
          .map((pageIndex) => ({
            pageIndex,
            data: new Uint8Array([1]),
            mimeType: "image/png",
          }))
          .reverse();
      },
    },
  });
  const page = {
    getViewport: () => ({
      width: 600,
      height: 800,
      convertToPdfPoint: (x, y) => [x, 800 - y],
    }),
    getTextContent: async () => ({ items: [] }),
  };
  const h = { title: "1 Introduction", level: 1, left: 0.1, top: 0.25 };
  const approx = api.locateHeading(h, 1, page, []);
  assert.equal(approx.x, 60);
  assert.equal(approx.y, 600);
  assert.equal(approx.exact, false);
  const exact = api.locateHeading(h, 1, page, [
    { str: "1 ", transform: [12, 0, 0, 12, 61, 590] },
    { str: "Introduction", transform: [12, 0, 0, 12, 70, 590] },
  ]);
  assert.equal(exact.x, 61);
  assert.equal(exact.y, 602);
  assert.equal(exact.exact, true);
  const rotated = {
    getViewport: () => ({
      width: 800,
      height: 600,
      convertToPdfPoint: (x, y) => [y, x],
    }),
  };
  const r = api.locateHeading(h, 3, rotated, []);
  assert.equal(r.x, 150);
  assert.equal(r.y, 80);
  agent = new api.OutlineRecognitionAgent(7, {
    numPages: 7,
    getPage: async () => page,
  });
  await assert.rejects(
    agent.run(() => {}),
    /network failure/,
  );
  assert.equal(agent.nextPage, 6);
  assert.equal(agent.headings.length, 5);
  failPage = 0;
  assert.equal(await agent.run(() => {}), true);
  assert.equal(agent.headings.length, 7);
  assert.deepEqual(renders, [0, 1, 2, 3, 4, 5, 6, 5, 6]);
  const tree = api.headingTree(agent.headings);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children.length, 6);
  assert.equal(
    api.headingTree([...agent.headings, agent.headings[2]])[0].children.length,
    6,
  );
  agent = new api.OutlineRecognitionAgent(7, {
    numPages: 7,
    getPage: async () => page,
  });
  cancelOnRender = true;
  const before = calls;
  assert.equal(await agent.run(() => {}), false);
  assert.equal(calls, before);
  assert.equal(agent.nextPage, 1);
  assert.deepEqual(json(agent.headings), []);
  cancelOnRender = false;
  invalid = true;
  await assert.rejects(
    agent.run(() => {}),
    /Invalid outline/,
  );
  assert.equal(agent.nextPage, 1);
  assert.equal(agent.headings.length, 0);
  invalid = false;
  cancelOnResponse = true;
  assert.equal(await agent.run(() => {}), false);
  assert.equal(agent.headings.length, 0);
  assert.equal(agent.nextPage, 1);
  cancelOnResponse = false;
  assert.equal(await agent.run(() => {}), true);
  assert.deepEqual(
    json(agent.headings.map((h) => h.page)),
    [1, 2, 3, 4, 5, 6, 7],
  );
  console.log("Outline recognition tests passed");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
