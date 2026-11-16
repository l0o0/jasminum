const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

function load(file, mocks, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Error,
      require: (name) =>
        mocks[name] ??
        load(path.resolve(path.dirname(file), `${name}.ts`), mocks, cache),
      Zotero: { getMainWindow: () => ({ AbortController }) },
    },
  );
  return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const entry = (title, pageLabel, level = 1) => ({ title, pageLabel, level });
const chapters = [
  entry("1 Introduction", "1"),
  entry("1.1 Details", "10", 2),
  entry("2 Methods", "90"),
  entry("3 Conclusion", "180"),
];
function contentsPages(entries = chapters, first = 3, last = 4) {
  const pages = new Map();
  for (let page = first; page <= last; page++) {
    const start = Math.floor(
      ((page - first) * entries.length) / (last - first + 1),
    );
    const end = Math.floor(
      ((page - first + 1) * entries.length) / (last - first + 1),
    );
    pages.set(page, {
      starts: page === first,
      continues: page !== last,
      entries: entries.slice(start, end),
    });
  }
  return pages;
}
function harness(options = {}) {
  const entries = options.entries ?? chapters;
  const numPages = options.numPages ?? 200;
  const contents = options.contents ?? contentsPages(entries);
  const physical = options.physical ?? ((entry) => Number(entry.pageLabel) + 6);
  const labels =
    options.labels ?? ((page) => (page >= 7 ? String(page - 6) : null));
  const requests = [],
    rendered = [],
    stages = [];
  let agent, failPage, cancelPage;
  const mocks = {
    "../../utils/llm": {
      getConfiguredLLMClient: () => ({
        createJSONCompletion: async (request) => {
          const pages = Array.from(
            request.responseFormat.schema.properties.pages.items.properties.page
              .enum,
          );
          assert(pages.length <= 5);
          assert.equal(request.images.length, pages.length);
          assert.equal(request.signal.aborted, false);
          requests.push(pages);
          stages.push(agent.stage);
          if (pages.includes(failPage))
            throw Error("calibration request failed");
          if (pages.includes(cancelPage)) agent.stop();
          const enhanced = request.responseFormat.name === "contents_outline";
          return {
            pages: pages
              .map((page) => ({
                page,
                headings: contents.has(page)
                  ? []
                  : entries
                      .filter((entry) => physical(entry) === page)
                      .map((entry) => ({
                        title: entry.title,
                        level: entry.level,
                        left: 0.1,
                        top: 0.2,
                      })),
                ...(enhanced
                  ? {
                      contents: contents.get(page) ?? null,
                      pageLabel: labels(page),
                    }
                  : {}),
              }))
              .reverse(),
          };
        },
      }),
    },
    "../../utils/pdfImage": {
      renderPDFPagesAsPNG: async (_id, indexes, renderOptions) => {
        assert.equal(renderOptions.saveDiagnostics, false);
        rendered.push(...Array.from(indexes, (index) => index + 1));
        return Array.from(indexes, (pageIndex) => ({
          pageIndex,
          data: new Uint8Array([1]),
          mimeType: "image/png",
        })).reverse();
      },
    },
  };
  const api = load(
    path.resolve("src/modules/outline/recognitionAgent.ts"),
    mocks,
  );
  agent = new api.OutlineRecognitionAgent(7, {
    numPages,
    getPage: async (page) => {
      assert(Number.isInteger(page) && page >= 1 && page <= numPages);
      return {
        getViewport: () =>
          options.viewport?.(page) ?? {
            width: 600,
            height: 800,
            convertToPdfPoint: (x, y) => [x, 800 - y],
          },
        getTextContent: async () => ({
          items: options.scanned
            ? []
            : entries
                .filter((entry) => physical(entry) === page)
                .map((entry) => ({
                  str: entry.title,
                  transform: [12, 0, 0, 12, 60, 688],
                })),
        }),
      };
    },
  });
  return {
    agent,
    requests,
    rendered,
    stages,
    setFailure: (page) => {
      failPage = page;
    },
    setCancel: (page) => {
      cancelPage = page;
    },
  };
}
async function run(fixture) {
  assert.equal(await fixture.agent.run(() => {}), true);
  assert(
    fixture.rendered.every(
      (page) => page >= 1 && page <= fixture.agent.pdf.numPages,
    ),
  );
}
async function main() {
  const { parsePrintedPage, findContentsCandidate } = load(
    path.resolve("src/modules/outline/tocAgent.ts"),
    {},
  );
  assert.deepEqual(plain(parsePrintedPage("Ⅳ")), { kind: "roman", value: 4 });
  assert.deepEqual(plain(parsePrintedPage("001")), {
    kind: "arabic",
    value: 1,
  });
  for (const invalid of ["", "0", "IIV", "A-1", "3-2", "1.5"])
    assert.equal(parsePrintedPage(invalid), null);
  const normal = harness();
  await run(normal);
  assert.equal(normal.agent.usedContents, true);
  assert.equal(
    normal.rendered.length,
    15,
    "text-layer target verification should not send body images",
  );
  assert.deepEqual(
    plain(normal.agent.headings.map((h) => h.page)),
    [7, 16, 96, 186],
  );
  assert(normal.agent.headings.every((h) => h.exact && h.y === 700));
  assert.deepEqual(plain(normal.agent.pageProgress), {
    completed: 15,
    total: 15,
  });
  await run(normal);
  assert.equal(
    normal.rendered.length,
    15,
    "completed agents must not resume full scanning",
  );
  const scanned = harness({
    scanned: true,
    viewport: (page) =>
      page === 16
        ? {
            width: 800,
            height: 600,
            convertToPdfPoint: (x, y) => [10 + y, 20 + x],
          }
        : undefined,
  });
  await run(scanned);
  assert.equal(scanned.agent.usedContents, true);
  assert.equal(
    scanned.rendered.length,
    17,
    "scans need only a few target-page checks after the initial 15",
  );
  assert(scanned.stages.includes("calibrating"));
  const pageOnly = scanned.agent.headings[1];
  assert.equal(pageOnly.pageOnly, true);
  assert.equal(pageOnly.exact, false);
  assert.deepEqual(
    [pageOnly.x, pageOnly.y],
    [10, 20],
    "page-only destinations use the rotated viewport's top-left, not the TOC row",
  );
  assert.equal(scanned.agent.headings[2].pageOnly, undefined);
  assert.equal(scanned.agent.headings[2].exact, false);
  assert.deepEqual(plain(scanned.agent.pageProgress), {
    completed: 17,
    total: 17,
  });
  const extended = harness({
    contents: contentsPages(chapters, 14, 16),
    physical: (entry) => Number(entry.pageLabel) + 16,
    labels: (page) => (page >= 17 ? String(page - 16) : null),
  });
  await run(extended);
  assert.equal(extended.agent.usedContents, true);
  assert.equal(
    extended.rendered.length,
    20,
    "a TOC continuing past page 15 extends the probe by one batch",
  );
  assert.deepEqual(
    plain(extended.agent.headings.map((h) => h.page)),
    [17, 26, 106, 196],
  );
  const romanEntries = [
    entry("Preface", "I"),
    entry("Abstract", "II"),
    entry("1 Introduction", "1"),
    entry("2 Main body", "20"),
    entry("3 Ending", "80"),
  ];
  const romanLabels = [null, null, "I", "II", "III", "IV"];
  const roman = harness({
    entries: romanEntries,
    contents: contentsPages(romanEntries, 6, 7),
    physical: (entry) => {
      const label = parsePrintedPage(entry.pageLabel);
      return label.value + (label.kind === "roman" ? 1 : 7);
    },
    labels: (page) =>
      page < 6 ? romanLabels[page] : page >= 8 ? String(page - 7) : null,
  });
  await run(roman);
  assert.equal(roman.agent.usedContents, true);
  assert.deepEqual(
    plain(roman.agent.headings.map((h) => h.page)),
    [2, 3, 8, 27, 87],
    "Roman and Arabic numbering have separate offsets",
  );
  const translated = contentsPages(chapters);
  for (const [page, contents] of contentsPages(
    chapters.map((e) => ({ ...e, title: `Translated ${e.title}` })),
    5,
    6,
  ))
    translated.set(page, contents);
  const bilingual = harness({ contents: translated });
  await run(bilingual);
  assert.equal(bilingual.agent.usedContents, true);
  assert.equal(
    bilingual.agent.headings.length,
    4,
    "do not merge duplicate translated tables of contents",
  );
  const noContents = harness({ contents: new Map(), numPages: 35 });
  await run(noContents);
  assert.equal(noContents.agent.usedContents, false);
  assert.equal(noContents.rendered.length, 35);
  assert.equal(
    new Set(noContents.rendered).size,
    35,
    "fallback reuses the first 15 pages",
  );
  const incomplete = contentsPages(chapters);
  incomplete.get(3).starts = false;
  const partial = harness({ contents: incomplete, numPages: 35 });
  await run(partial);
  assert.equal(partial.agent.usedContents, false);
  assert.equal(partial.rendered.length, 35);
  const boundary = new Map([
    [
      15,
      {
        page: 15,
        headings: [],
        contents: { starts: true, continues: false, entries: chapters },
      },
    ],
  ]);
  assert.equal(
    findContentsCandidate(boundary, 15),
    null,
    "even an apparently complete TOC at the boundary needs a following-page check",
  );
  const brokenOffset = harness({
    scanned: true,
    labels: (page) =>
      page >= 50 ? String(page - 7) : page >= 7 ? String(page - 6) : null,
  });
  await run(brokenOffset);
  assert.equal(
    brokenOffset.agent.usedContents,
    false,
    "a missing or extra page invalidates a constant offset",
  );
  assert.equal(new Set(brokenOffset.rendered).size, 200);
  assert.equal(
    brokenOffset.rendered.length,
    200,
    "reuse sampled target pages during full fallback",
  );
  assert.equal(brokenOffset.agent.nextPage, 201);
  const unsupported = harness({
    entries: [entry("1 Intro", "1"), entry("Appendix", "A-1")],
    numPages: 35,
  });
  await run(unsupported);
  assert.equal(unsupported.agent.usedContents, false);
  const failed = harness({ scanned: true });
  failed.setFailure(96);
  await assert.rejects(
    failed.agent.run(() => {}),
    /calibration request failed/,
  );
  assert.equal(failed.agent.nextPage, 16);
  failed.setFailure(undefined);
  await run(failed);
  assert.equal(failed.agent.usedContents, true);
  assert.equal(
    failed.rendered.filter((page) => page <= 15).length,
    15,
    "resume must not resend a completed initial probe",
  );
  const stopped = harness({ scanned: true });
  stopped.setCancel(96);
  assert.equal(await stopped.agent.run(() => {}), false);
  assert.equal(stopped.agent.nextPage, 16);
  assert.equal(stopped.agent.usedContents, false);
  stopped.setCancel(undefined);
  await run(stopped);
  assert.equal(stopped.agent.usedContents, true);
  assert.equal(stopped.agent.headings.length, 4);
  const edited = harness({ scanned: true });
  edited.setCancel(96);
  assert.equal(await edited.agent.run(() => {}), false);
  edited.agent.headings[0].title = "My manually edited heading";
  edited.agent.keepPartialOutline();
  edited.setCancel(undefined);
  await run(edited);
  assert.equal(edited.agent.usedContents, false);
  assert.equal(
    edited.agent.headings[0].title,
    "My manually edited heading",
    "resuming must preserve edits to a stopped partial result",
  );
  console.log(
    "Contents-first outline, page offsets, scanned PDFs, fallback reuse, cancellation and resume passed",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
