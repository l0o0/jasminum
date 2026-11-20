const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const { outputText } = ts.transpileModule(
  fs.readFileSync("src/utils/pdfParser.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
);

function titleFromCover(rows) {
  // Each line contains one recognizer word. The PDF worker reports its bounds,
  // font size, baseline, style flags, font index and text in a fixed tuple.
  const lines = rows.map(([text, size], index) => {
    const y = 50 + index * 40;
    const word = [
      50,
      y,
      350,
      y + size,
      size,
      0,
      y + size,
      0,
      0,
      0,
      0,
      0,
      0,
      text,
    ];
    return [[word]];
  });
  const page = [595, 842, [[[[0, 0, 0, 0, lines]]]]];
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Zotero: {
      PDFWorker: {
        getRecognizerData: async () => ({
          metadata: {},
          totalPages: 100,
          pages: [page],
        }),
      },
      Utilities: { trimInternal: (value) => value.trim().replace(/\s+/g, " ") },
    },
    ztoolkit: { log() {} },
  });
  return exports.getPDFTitle(1);
}

test("a thesis cover label identifies the title even when the school uses larger type", async () => {
  const title = await titleFromCover([
    ["海湾示例大学", 28],
    ["博士学位论文", 16],
    ["海湾潮汐的季节变化研究", 20],
  ]);
  assert.equal(title, "海湾潮汐的季节变化研究");
});

test("a thesis without a title label falls back to the largest candidate", async () => {
  const title = await titleFromCover([
    ["学校代码：12345", 14],
    ["海湾潮汐的季节变化研究", 20],
    ["作者姓名：王宁", 12],
  ]);
  assert.equal(title, "海湾潮汐的季节变化研究");
});
