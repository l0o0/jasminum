const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const pdf = require("pdf-lib");

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Error,
    require: (n) => mocks[n] ?? require(n),
    console: { log() {} },
    ...globals,
  });
  return exports;
}

async function main() {
  const input = await pdf.PDFDocument.create();
  input.addPage();
  let bytes = await input.save(),
    writes = 0;
  const worker = load(
    "src/modules/workers/outline.ts",
    {},
    {
      IOUtils: {
        read: async () => bytes,
        write: async (path, data, options) => {
          assert.ok(options.tmpPath);
          bytes = data;
          writes++;
        },
      },
    },
  );
  const node = (title, children = []) => ({
    title,
    level: 1,
    page: 1,
    x: 10,
    y: 100,
    children,
  });
  await worker.addOutlineToPDF("memory.pdf", [
    node("A", [node("B", [node("C")])]),
    node("D"),
  ]);
  const saved = await pdf.PDFDocument.load(bytes),
    name = pdf.PDFName.of;
  const rootRef = saved.catalog.get(name("Outlines"));
  const root = saved.context.lookup(rootRef, pdf.PDFDict);
  assert.equal(root.get(name("Count")).asNumber(), 4);
  let parentRef = rootRef,
    ref = root.get(name("First"));
  for (const title of ["A", "B", "C"]) {
    const entry = saved.context.lookup(ref, pdf.PDFDict);
    assert.equal(entry.get(name("Title")).decodeText(), title);
    assert.equal(entry.get(name("Parent")).toString(), parentRef.toString());
    parentRef = ref;
    ref = entry.get(name("First"));
  }
  const before = bytes;
  await assert.rejects(
    worker.addOutlineToPDF("memory.pdf", [{ ...node("Invalid"), page: 2 }]),
    /Invalid outline destination/,
  );
  assert.equal(bytes, before);
  assert.equal(writes, 1);
  await worker.addOutlineToPDF("memory.pdf", []);
  assert.equal(
    (await pdf.PDFDocument.load(bytes)).catalog.has(name("Outlines")),
    false,
  );
  assert.equal((await pdf.PDFDocument.load(bytes)).getPageCount(), 1);

  let reply;
  const workerSelf = {
    postMessage: (data) => {
      reply = data;
    },
  };
  load(
    "src/modules/workers/index.ts",
    {
      "./outline": {
        addOutlineToPDF: async () => {
          throw new Error("Read only");
        },
      },
    },
    { self: workerSelf },
  );
  await workerSelf.onmessage({ data: { action: "addOutline", jobID: "test" } });
  assert.equal(reply.status, "error");
  assert.equal(reply.jobID, "test");
  assert.equal(reply.error, "Read only");

  const events = load(
    "src/modules/outline/events.ts",
    {
      "./outline": { saveOutlineToJSON: async () => {} },
      "./bookmark": { saveBookmarksToJSON: async () => {} },
      "./style": {},
      "../../utils/locale": {},
      "../../utils/prefs": {},
    },
    { ztoolkit: { log() {} } },
  );
  for (const kind of ["bookmark", "outline"]) {
    for (const [drag, targetIndex, y, expected] of [
      [0, 2, 65, "BAC"],
      [0, 2, 85, "BCA"],
      [2, 0, 5, "CAB"],
      [2, 0, 25, "ACB"],
    ]) {
      const list = ["A", "B", "C"].map((id) => ({ id }));
      const dragged = list[drag],
        targetLi = list[targetIndex];
      const parent = {
        id: "root-list",
        tagName: "UL",
        children: list,
        removeChild(n) {
          list.splice(list.indexOf(n), 1);
        },
        insertBefore(n, ref) {
          list.splice(ref ? list.indexOf(ref) : list.length, 0, n);
        },
      };
      for (const n of list) {
        n.parentNode = parent;
        n.querySelector = (s) =>
          s === "ul"
            ? null
            : { classList: { add() {}, remove() {} }, setAttribute() {} };
        Object.defineProperty(n, "nextSibling", {
          get: () => list[list.indexOf(n) + 1] || null,
        });
      }
      const doc = {
        defaultView: {},
        querySelector: (s) =>
          s === ".dragging" ? dragged : { classList: { remove() {} } },
        querySelectorAll: () => [],
      };
      const target = {
        ownerDocument: doc,
        closest: (s) => (s === "li" ? targetLi : target),
        getBoundingClientRect: () => ({
          top: list.indexOf(targetLi) * 30,
          height: 30,
        }),
      };
      await events[kind === "bookmark" ? "handleBookmarkDrop" : "handleDrop"]({
        preventDefault() {},
        target,
        clientY: y,
      });
      assert.equal(list.map((n) => n.id).join(""), expected);
    }
  }
  // Every terminal worker outcome must restore the save button and release the worker.
  for (const mode of [
    "success",
    "failure",
    "error",
    "messageerror",
    "posterror",
  ]) {
    let terminated = 0,
      reloaded = 0,
      alerts = 0;
    const handlers = new Map();
    const elements = new Map();
    const doc = {
      querySelector: () => ({ addEventListener() {} }),
      getElementById: (id) => {
        if (!elements.has(id))
          elements.set(id, {
            addEventListener(type, fn) {
              handlers.set(`${id}:${type}`, fn);
            },
            disabled: false,
          });
        return elements.get(id);
      },
    };
    const reader = {
      _iframeWindow: {
        document: doc,
        alert() {
          alerts++;
        },
      },
      _item: { getFilePathAsync: async () => "memory.pdf" },
      async reload() {
        assert.equal(this, reader);
        reloaded++;
        if (mode === "refresherror") throw new Error("Refresh failed");
      },
    };
    class FakeWorker {
      terminate() {
        terminated++;
      }
      postMessage(request) {
        if (mode === "posterror") throw new Error("Cannot post");
        if (mode === "error")
          this.onerror({ preventDefault() {}, message: "Crashed" });
        else if (mode === "messageerror") this.onmessageerror();
        else
          this.onmessage({
            data: {
              ...request,
              action: "addOutlineReturn",
              status: ["success", "refresherror"].includes(mode)
                ? "success"
                : "error",
            },
          });
      }
    }
    const runner = load(
      "src/modules/outline/events.ts",
      {
        "./outline": {
          getOutlineFromPage: (d) => {
            assert.equal(d, doc);
            return [];
          },
          saveOutlineToJSON: async (item) => assert.equal(item, reader._item),
        },
        "./bookmark": {},
        "./style": {},
        "../../utils/locale": { getString: (x) => x },
        "../../utils/prefs": {},
      },
      {
        Worker: FakeWorker,
        Zotero: { Utilities: { randomString: () => "test" } },
        ztoolkit: { log() {} },
      },
    );
    runner.initEventListener(reader, doc);
    const button = doc.getElementById("j-outline-save-pdf");
    await handlers.get("j-outline-save-pdf:click")({ currentTarget: button });
    assert.equal(button.disabled, false);
    assert.equal(terminated, 1);
    assert.equal(reloaded, ["success", "refresherror"].includes(mode) ? 1 : 0);
    assert.equal(alerts, mode === "success" ? 0 : 1);
  }

  let added,
    initialized = 0,
    clicked;
  const doc = {
    querySelector: () => null,
    getElementById: (id) => ({
      click() {
        clicked = id;
      },
    }),
  };
  const selectedReader = {
    _item: { attachmentContentType: "application/pdf" },
    _iframeWindow: { document: doc },
    _internalReader: {
      toggleSidebar() {},
      _lastView: {
        _selectionRanges: [
          {
            text: "  Heading\n one ",
            position: { pageIndex: 2, rects: [[10, 20, 30, 40]] },
          },
        ],
      },
    },
  };
  const selection = load(
    "src/modules/outline/selection.ts",
    {
      "../../utils/prefs": { getPref: () => true },
      "../../utils/locale": { getString: (x) => x },
      "./index": {
        addOutlineToReader: async (reader) => {
          assert.equal(reader, selectedReader);
          initialized++;
        },
      },
      "./outline": {
        getOutlineFromPage: () => [],
        createTreeNodes() {},
        saveOutlineToJSON: async (item, data) => {
          assert.equal(item, selectedReader._item);
          added = data;
        },
      },
      "./bookmark": {
        DEFAULT_BOOKMARK_COLORS: ["blue"],
        getBookmarksFromPage: () => [],
        createBookmarkNodes() {},
        saveBookmarksToJSON: async (item, data) => {
          assert.equal(item, selectedReader._item);
          added = data;
        },
      },
    },
    { Zotero: { Utilities: { randomString: () => "test" } } },
  );
  const snapshot = selection.getSelectedPDFText(selectedReader);
  assert.equal(snapshot.text, "Heading one");
  selectedReader._internalReader._lastView._selectionRanges[0].position.rects[0][3] = 999;
  for (const kind of ["bookmark", "outline"]) {
    await selection.addSelectionEntry(selectedReader, snapshot, kind);
    assert.equal(added[0].title, "Heading one");
    assert.equal(added[0].page, 3);
    assert.equal(added[0].y, 40);
    assert.equal(clicked, `j-${kind}-button`);
  }
  assert.equal(initialized, 2);
  selectedReader._internalReader._lastView._selectionRanges[0].collapsed = true;
  assert.equal(selection.getSelectedPDFText(selectedReader), null);
  assert.equal(
    selection.normalizeSelection({ text: " ", position: snapshot.position }),
    null,
  );
  assert.equal(
    selection.normalizeSelection({
      text: "x",
      position: { pageIndex: -1, rects: [[0, 0, 0, 0]] },
    }),
    null,
  );
  console.log(
    "Outline PDF structure, empty/invalid saves, worker lifecycle, bookmark reordering, and text selection passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
