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
    { exports, Error, require: (name) => mocks[name], ...globals },
  );
  return exports;
}

async function main() {
  let request,
    recognize,
    translated = 0,
    fallback = 0;
  const stages = [];
  const globals = {
    Zotero: {
      getMainWindow: () => ({ AbortController }),
      Utilities: { Internal: { md5: (value) => value } },
    },
    addon: {
      data: {
        progress: {
          addTaskToProgressWindow: async () => {},
          updateTaskStatus(task) {
            stages.push({ summary: task.summary, pages: task.pageProgress });
          },
        },
      },
    },
    ztoolkit: { log() {} },
  };
  class Service {
    search() {
      fallback++;
      return [];
    }
  }
  const locale = { getString: (key) => key };
  const { metaSearch } = load(
    "src/modules/services/index.ts",
    {
      "../../utils/pattern": {},
      "../../utils/pdfParser": {},
      "../../utils/prefs": {
        getMetadataSources: () => ["AI", "CNKI"],
        getPref: () => "custom",
      },
      "../../utils/detect": {
        isChineseTopAttachment: () => true,
        isChinsesSnapshot: () => false,
      },
      "./cnki": { CNKI: Service },
      "./pubscholar": { PubScholar: Service },
      "./ncpssd": { NCPSSD: Service },
      "./yiigle": { Yiigle: Service },
      "./wanfangdata": { WanfangData: Service },
      "string-similarity": {},
      "./searchChain": {},
      "../../utils/llm": { getConfiguredLLMClient: () => ({}) },
      "../../utils/locale": locale,
      "../../utils/pdfMetadata": {
        recognizePDFAttachment: async (_client, _id, options) => {
          request = options;
          options.onProgress("rendering");
          options.onProgress("recognizing", 3);
          return recognize(options);
        },
      },
    },
    globals,
  );
  const { TaskRunner } = load(
    "src/utils/task.ts",
    {
      "../modules/metadata/task": { MetadataTask: class {} },
      "../modules/outline/task": { OutlineTask: class {} },
      "../modules/services": {
        metaSearch,
        metaTranslate: async () => translated++,
      },
      "../modules/attachments": {},
      "./locale": locale,
      "../../package.json": { version: "test" },
    },
    globals,
  );
  const runner = new TaskRunner();
  globals.addon.taskRunner = runner;
  const item = (id) => ({ id, isPDFAttachment: () => true });
  recognize = async (options) => {
    options.onProgress("complete", 3);
    return { metadata: { title: "Recognized" } };
  };
  const success = runner.createTask(item(1), "attachment");
  await runner.addTask(success);
  assert(
    request.signal instanceof AbortSignal,
    "forward a real signal to recognition",
  );
  assert(
    stages.some(
      (s) => s.summary === "metadata-update-rendering" && s.pages?.total === 0,
    ),
  );
  assert(stages.some((s) => s.pages?.total === 3));
  assert.equal(success.pageProgress, undefined);
  assert.equal(success.summary, undefined);
  assert.equal(translated, 1);
  let aborts = 0;
  recognize = (options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => {
          aborts++;
          reject(new Error("Request cancelled"));
        },
        { once: true },
      );
    });
  const cancelled = runner.createTask(item(2), "attachment");
  const pending = runner.addTask(cancelled);
  await new Promise((r) => setImmediate(r));
  const queued = runner.addTask(runner.createTask(item(3), "attachment"));
  runner.clearTasks();
  await Promise.all([pending, queued]);
  assert.equal(aborts, 1, "close must abort the running model request");
  assert.equal(request.signal.aborted, true);
  assert.equal(cancelled.aiMetadata, undefined);
  assert.equal(cancelled.pageProgress, undefined);
  assert.equal(translated, 1, "cancelled results cannot be imported");
  assert.equal(fallback, 0, "cancel must not start another source");
  assert.equal(runner.tasks.length, 0);
  console.log("Attachment AI progress and request cancellation passed");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
