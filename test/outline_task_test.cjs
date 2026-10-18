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
    { exports, require: (n) => mocks[n], Error, ...globals },
  );
  return exports;
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function main() {
  const events = [],
    starts = [];
  let gate,
    fail = false,
    workerRuns = 0;
  class Agent {
    constructor(id, pdf) {
      this.pdf = pdf;
      this.nextPage = 1;
      this.headings = [];
      this.id = id;
    }
    stop() {
      this.stopped = true;
    }
    async run(progress) {
      this.stopped = false;
      workerRuns++;
      starts.push(this.id);
      progress(this.nextPage, 3);
      if (gate) await gate.promise;
      if (this.stopped) return false;
      if (fail) {
        this.nextPage = 2;
        throw Error("network failure");
      }
      this.nextPage = 4;
      this.headings = [{ title: "Heading", level: 1, page: 1, x: 0, y: 10 }];
      return true;
    }
  }
  const pdf = {
    numPages: 3,
    getPage: async () => ({
      getViewport: () => ({
        width: 600,
        height: 800,
        convertToPdfPoint: (x, y) => [x, 800 - y],
      }),
    }),
  };
  const reader = {
    _initPromise: Promise.resolve(),
    _internalReader: { toggleSidebar() {} },
    _iframeWindow: { document: {} },
    _primaryView: {
      _iframeWindow: { PDFViewerApplication: { pdfDocument: pdf } },
    },
  };
  const item = (id) => ({
    id,
    getField: () => `PDF ${id}`,
    isPDFAttachment: () => true,
    isEditable: () => true,
    getFilePathAsync: async () => "/test.pdf",
  });
  const addon = {
    data: {
      progress: {
        updateTaskStatus: (task, status) =>
          events.push([task.id, status, task.completedPages]),
        addTaskToProgressWindow: async () => {},
      },
    },
  };
  let openedReaders = 0;
  let storedOutline = [];
  let pdfWrites = 0;
  let failPDF = false;
  const Zotero = {
    Reader: {
      _readers: [],
      open: async () => {
        openedReaders++;
        return reader;
      },
    },
    Utilities: { Internal: { md5: (x) => x } },
    version: "10",
  };
  const globals = { addon, Zotero, ztoolkit: { log() {} } };
  const locale = { getString: (s) => s };
  const { OutlineTask } = load(
    "src/modules/outline/task.ts",
    {
      "../../utils/locale": locale,
      "./index": { addOutlineToReader: async () => {} },
      "./pdfAdapter": { adaptOutlinePDFDocument: async () => pdf },
      "./savePDF": {
        writePDFOutline: async () => {
          if (failPDF) throw Error("PDF write failed");
          pdfWrites++;
        },
      },
      "./outline": {
        getOutlineFromPage: () => [],
        getOutlineFromPDF: async () => storedOutline,
        saveOutlineToJSON: async (_item, nodes) => {
          storedOutline = nodes;
        },
      },
      "./recognitionAgent": {
        OutlineRecognitionAgent: Agent,
        headingTree: (nodes) => nodes,
      },
    },
    globals,
  );
  const { TaskRunner } = load(
    "src/utils/task.ts",
    {
      "../modules/outline/task": { OutlineTask },
      "../modules/services": {},
      "./locale": locale,
      "../modules/attachments": {},
      "../../package.json": { version: "test" },
    },
    globals,
  );
  const runner = new TaskRunner();
  addon.taskRunner = runner;
  const task = runner.createTask(item(1), "outline");
  assert(task instanceof OutlineTask);
  assert.equal(task.id, "outline-1");
  assert.equal(runner.getTaskType(task), "outline");
  gate = deferred();
  const first = runner.addTask(task);
  await new Promise((r) => setImmediate(r));
  assert.equal(task.status, "processing");
  const secondTask = runner.createTask(item(2), "outline");
  const second = runner.addTask(secondTask);
  await new Promise((r) => setImmediate(r));
  assert.equal(secondTask.status, "waiting");
  assert.deepEqual(starts, [1]);
  // Duplicate enqueue never invokes the recognition agent twice.
  await runner.addTask(runner.createTask(item(1), "outline"));
  assert.equal(runner.tasks.length, 2);
  // A queued stop does not make a remote request when its queue turn arrives.
  secondTask.stop();
  assert.equal(secondTask.status, "paused");
  task.stop();
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(task.status, "paused");
  assert.equal(workerRuns, 1);
  assert.equal(runner.runningTask, null);
  gate = undefined;
  fail = true;
  await runner.retryOutlineTask(task);
  assert.equal(task.status, "fail");
  assert.equal(task.completedPages, 1);
  assert(task.message.includes("network failure"));
  fail = false;
  await runner.retryOutlineTask(task);
  assert.equal(task.status, "success");
  assert.equal(task.completedPages, 3);
  assert(task.canApply);
  assert.equal(openedReaders, 0, "Recognition must not open a reader");
  failPDF = true;
  await assert.rejects(task.apply(), /PDF write failed/);
  assert.equal(task.applied, false);
  assert.equal(storedOutline.length, 0);
  failPDF = false;
  await task.apply();
  assert.equal(openedReaders, 0, "Saving must not open a reader");
  assert.equal(storedOutline.length, 1);
  assert.equal(pdfWrites, 1);
  await task.undo();
  assert.equal(pdfWrites, 2);
  assert.equal(storedOutline.length, 0);
  storedOutline = [{ title: "External edit", level: 1, page: 1, x: 0, y: 0 }];
  await assert.rejects(task.apply(), /outline-ai-changed/);
  storedOutline = [];
  // Task results belong to the runner, not to an open preview window.
  assert.equal(runner.getTaskById(task.id), task);
  assert.equal(task.headings.length, 1);
  assert(task.canRestart);
  await runner.retryOutlineTask(task);
  assert.equal(task.status, "success");
  Object.assign(task.headings[0], { left: 0.1, top: 0.25, exact: true });
  assert.equal(await task.changeHeadingPage(0, 0), false);
  assert.equal(await task.changeHeadingPage(0, 4), false);
  assert.equal(await task.changeHeadingPage(0, 2.5), false);
  assert.equal(await task.changeHeadingPage(0, 2), true);
  assert.equal(task.headings[0].page, 2);
  assert.equal(task.headings[0].x, 60);
  assert.equal(task.headings[0].y, 600);
  assert.equal(task.headings[0].exact, false);
  // Edits affect the same result list used by apply, preserving destinations.
  task.headings.push({ title: "Second", level: 2, page: 3, x: 15, y: 25 });
  const moved = task.headings[1];
  assert.equal(task.moveHeading(1, 0), 0);
  assert.equal(task.headings[0], moved);
  assert.equal(task.headings[0].page, 3);
  assert.equal(task.editHeading(0, "ArrowUp"), 0);
  assert.equal(task.headings[0], moved);
  assert.equal(task.moveHeading(0, 2), 1);
  assert.equal(task.headings[1], moved);
  assert.equal(task.moveHeading(1, 1), 1);
  assert.equal(task.moveHeading(1, 0), 0);
  task.editHeading(0, "ArrowLeft");
  task.editHeading(0, "ArrowLeft");
  assert.equal(moved.level, 1);
  for (let i = 0; i < 10; i++) task.editHeading(0, "ArrowRight");
  assert.equal(moved.level, 7);
  task.reportError(new Error("preview navigation failed"));
  assert(task.message.includes("preview navigation failed"));
  assert.equal(task.summary, "outline-ai-error-details");
  task.applied = true;
  task.editHeading(0, "Delete");
  assert.equal(task.headings.length, 2);
  task.applied = false;
  task.status = "processing";
  task.editHeading(0, "Delete");
  assert.equal(task.headings.length, 2);
  task.status = "success";
  assert.equal(task.editHeading(0, "Delete"), 0);
  assert.equal(task.headings.length, 1);
  assert.equal(task.editHeading(0, "Backspace"), -1);
  assert.equal(task.headings.length, 0);
  assert.equal(task.canApply, false);
  let updates = 0;
  const off = task.subscribe(() => updates++);
  task.status = "success";
  off();
  task.status = "success";
  assert.equal(updates, 1);
  assert(events.some((e) => e[1] === "fail"));
  assert(events.some((e) => e[1] === "paused"));
  const { Progress } = load(
    "src/modules/progress.ts",
    {
      "./outline/task": { OutlineTask },
      "./outline/taskView": {},
      "../utils/locale": locale,
      "./preferences/remoteHelp": {},
    },
    globals,
  );
  const progress = new Progress();
  let opened = 0;
  const rendered = [];
  const opening = deferred();
  progress.initializeProgressWindow = async () => {
    opened++;
    await opening.promise;
    progress.progressWindow = { closed: false, focus() {} };
  };
  progress.renderTask = (task) => rendered.push(task.id);
  const open1 = progress.openProgressWindow();
  const open2 = progress.openProgressWindow();
  opening.resolve();
  await Promise.all([open1, open2]);
  assert.equal(opened, 1);
  assert.equal(rendered.length, runner.tasks.length);
  progress.progressWindow = null;
  rendered.length = 0;
  await progress.openProgressWindow();
  assert.equal(opened, 2);
  assert.deepEqual(
    rendered,
    Array.from(runner.tasks, (task) => task.id),
  );
  // Menu/sidebar entry starts a task immediately and resolves the preferred PDF.
  const enqueued = [];
  const resumed = [];
  const preferred = { id: 91, isPDFAttachment: () => true };
  const viewRunner = {
    getTaskById: () => undefined,
    createTask: (item) => item,
    addTask: async (item) => enqueued.push(item.id),
    retryOutlineTask: async (task) => resumed.push(task.id),
  };
  const { openOutlineTask } = load(
    "src/modules/outline/taskView.ts",
    {
      "../../utils/locale": locale,
      "./task": { OutlineTask },
    },
    {
      addon: {
        taskRunner: viewRunner,
        data: {
          progress: {
            openProgressWindow: async () => {},
            progressWindow: { document: { getElementById: () => null } },
          },
        },
      },
    },
  );
  await openOutlineTask(preferred);
  await openOutlineTask({
    isPDFAttachment: () => false,
    isRegularItem: () => true,
    getBestAttachments: async () => [
      { isPDFAttachment: () => false },
      preferred,
    ],
  });
  assert.deepEqual(enqueued, [91, 91]);
  viewRunner.getTaskById = () => task;
  task.status = "paused";
  await openOutlineTask(preferred);
  assert.deepEqual(resumed, [task.id]);
  assert.equal(enqueued.length, 2);
  console.log(
    "OutlineTask queue, deduplication, cancellation, retry and result retention passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
