const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const pdfLib = require("pdf-lib");
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (n) => mocks[n] ?? require(n), Error, ...globals },
  );
  return exports;
}
async function main() {
  const doc = await pdfLib.PDFDocument.create();
  for (const rotation of [0, 90, 180, 270, 0, 90, 180]) {
    const p = doc.addPage([600, 800]);
    p.setCropBox(10, 20, 400, 500);
    p.setRotation(pdfLib.degrees(rotation));
  }
  const bytes = await doc.save();
  let writes = 0;
  const worker = load(
    "src/modules/workers/outline.ts",
    {},
    { IOUtils: { read: async () => bytes, write: async () => writes++ } },
  );
  const pages = await worker.getPageGeometries("/test.pdf");
  assert.equal(pages.length, 7);
  assert.equal(writes, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(pages[0])), {
    x: 10,
    y: 20,
    width: 400,
    height: 500,
    rotation: 0,
  });
  const geometry = load("src/modules/outline/pageGeometry.ts");
  const expected = [
    [110, 420],
    [90, 145],
    [310, 120],
    [330, 395],
  ];
  pages.slice(0, 4).forEach((page, i) => {
    const v = geometry.geometryViewport(page);
    assert.deepEqual(
      Array.from(v.convertToPdfPoint(v.width * 0.25, v.height * 0.2)),
      expected[i],
    );
  });
  let batches = 0,
    terminated = 0;
  const adapter = load(
    "src/modules/outline/pdfAdapter.ts",
    {
      "./pageGeometry": { ...geometry, readPageGeometries: async () => pages },
      "./background": {
        outlineJob: async (_action, _path, { pageIndexes }) => {
          batches++;
          return worker.extractTextPDF("/test.pdf", Array.from(pageIndexes));
        },
      },
    },
    {
      setTimeout,
      clearTimeout,
      Worker: class {
        postMessage() {
          const word = [
            60,
            100,
            100,
            112,
            12,
            0,
            110,
            0,
            0,
            0,
            0,
            0,
            0,
            "Title",
          ];
          this.onmessage({
            data: { textPages: pages.map(() => [400, 500, [[word]]]) },
          });
        }
        terminate() {
          terminated++;
        }
      },
    },
  );
  const adapted = await adapter.adaptOutlinePDFDocument("/test.pdf");
  const page = await adapted.getPage(1);
  assert.equal(page.getViewport({ scale: 1 }).width, 400);
  const text = (await page.getTextContent()).items[0];
  assert.equal(text.str, "Title");
  assert.equal(text.transform[5], 420);
  await (await adapted.getPage(4)).getTextContent();
  assert.equal(batches, 1);
  assert.equal(terminated, 1);
  await (await adapted.getPage(6)).getTextContent();
  assert.equal(batches, 2);
  assert.equal(terminated, 2);
  const subset = await pdfLib.PDFDocument.load(
    await worker.extractTextPDF("/test.pdf", [3, 1]),
  );
  assert.equal(subset.getPageCount(), 2);
  assert.equal(subset.getPage(0).getRotation().angle, 270);
  assert.equal(writes, 0);
  await assert.rejects(adapted.getPage(0), /Invalid PDF page number/);
  assert.throws(
    () =>
      geometry.geometryViewport({
        x: 0,
        y: 0,
        width: NaN,
        height: 100,
        rotation: 0,
      }),
    /geometry/,
  );
  let cache = { info: { schema: 2 }, outline: [] },
    nativeReads = 0;
  const outlineAPI = load(
    "src/modules/outline/outline.ts",
    {
      "./background": {
        outlineJob: async () => {
          nativeReads++;
          return [
            { title: "Native", level: 1, page: 1, x: 10, y: 100, children: [] },
          ];
        },
      },
      "../../../package.json": { version: "test" },
      "../../utils/locale": {},
      "./style": {},
    },
    {
      PathUtils: { join: (...parts) => parts.join("/") },
      IOUtils: { exists: async () => cache !== null },
      Zotero: {
        DataDirectory: { dir: "/tmp" },
        File: {
          getContentsAsync: async () => JSON.stringify(cache),
          putContentsAsync: async (_path, content) => {
            cache = JSON.parse(content);
          },
        },
      },
      ztoolkit: { log() {} },
    },
  );
  const item = { id: 1, key: "KEY", getFilePathAsync: async () => "/test.pdf" };
  assert.equal((await outlineAPI.getOutlineFromPDF(item)).length, 0);
  assert.equal(
    nativeReads,
    0,
    "Empty JSON must take precedence over native bookmarks",
  );
  cache = null;
  assert.equal((await outlineAPI.getOutlineFromPDF(item))[0].title, "Native");
  assert.equal(nativeReads, 1);
  await outlineAPI.getOutlineFromPDF({ _item: item });
  assert.equal(
    nativeReads,
    1,
    "Existing reader callers should reuse the same JSON-first interface",
  );
  console.log(
    "Background PDF geometry, rotations, text coordinates, batch reuse and read-only extraction passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
