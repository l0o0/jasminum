const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(path, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (n) => mocks[n], Error, ...globals },
  );
  return exports;
}
const diff = load("src/modules/metadata/diff.ts");
const snapshot = {
  itemType: "journalArticle",
  fields: {
    title: "Original",
    volume: "",
    creators: [{ creatorType: "editor", name: "Editor" }],
  },
};
let gate,
  request,
  requestedAttachment,
  writes = [],
  conflict = false,
  recognitionError;
const item = {
  id: 1,
  getAttachments: () => [2],
  getField: () => "Original",
  isRegularItem: () => true,
  isEditable: () => true,
};
const candidate = {
  metadata: {
    itemType: "journalArticle",
    title: "AI title",
    volume: "42",
    creators: [{ creatorType: "author", name: "Author" }],
  },
  evidence: [],
  source: { attachmentID: 2 },
};
const globals = {
  Zotero: {
    debug() {},
    getMainWindow: () => ({ AbortController }),
    Items: {
      get: (id) => ({
        id,
        isPDFAttachment: () => true,
        getField: () => `PDF ${id}`,
      }),
    },
  },
  addon: { data: { progress: { updateTaskStatus() {} } } },
  ztoolkit: { log() {} },
};
const { MetadataTask } = load(
  "src/modules/metadata/task.ts",
  {
    "../../utils/locale": { getString: (k) => k },
    "./diff": diff,
    "./retrieve": {
      retrieveFromPDF: async (id, _parent, options) => {
        requestedAttachment = id;
        request = options;
        options.onProgress("recognizing", 3);
        if (gate) await gate;
        if (recognitionError) throw recognitionError;
        options.onProgress("complete", 3);
        return {
          ...candidate,
          metadata: { ...candidate.metadata, volume: id === 3 ? "99" : "42" },
          source: { ...candidate.source, attachmentID: id },
        };
      },
    },
    "./apply": {
      snapshotItem: () => snapshot,
      applyChanges: async (_id, _snapshot, changes) => {
        if (conflict) throw Error("metadata-update-stale");
        writes.push(changes);
      },
    },
  },
  globals,
);
async function main() {
  const task = new MetadataTask(item);
  await task.run();
  assert.equal(task.status, "success", task.message);
  assert.equal(
    task.pageProgress,
    undefined,
    "finished tasks show review status",
  );
  assert.equal(writes.length, 0, "recognition must not write metadata");
  assert.equal(task.changes.find((c) => c.field === "title").selected, false);
  assert.equal(task.changes.find((c) => c.field === "volume").selected, true);
  task.changes.find((c) => c.field === "creators").after[1].name =
    "Edited editor";
  assert.equal(
    snapshot.fields.creators[0].name,
    "Editor",
    "editing must not mutate conflict snapshot",
  );
  task.changes.find((c) => c.field === "volume").after = "43";
  conflict = true;
  await assert.rejects(task.apply(), /stale/);
  assert.equal(task.applied, false);
  assert.equal(task.saving, false);
  conflict = false;
  await task.apply();
  assert.equal(writes[0].length, 1);
  assert.equal(writes[0][0].after, "43");
  assert.equal(task.applied, true);
  await task.undo();
  assert.equal(writes[1][0].before, "43");
  assert.equal(writes[1][0].after, "");
  assert.equal(task.applied, false);
  let release;
  gate = new Promise((r) => (release = r));
  assert.equal(task.prepareRetry(), true);
  const running = task.run();
  assert.equal(task.pageProgress.completed, 0);
  assert.equal(task.pageProgress.total, 3);
  task.stop();
  assert.equal(request.signal.aborted, true);
  assert.equal(task.canRetry, false);
  release();
  await running;
  gate = undefined;
  assert.equal(task.status, "paused");
  assert.equal(
    task.candidate,
    undefined,
    "cancelled request must not publish result",
  );
  assert.equal(task.prepareRetry(), true);
  await task.run();
  assert.equal(task.status, "success", task.message);
  const queued = new MetadataTask(item);
  queued.stop();
  await queued.run();
  assert.equal(queued.candidate, undefined);
  const multiple = new MetadataTask({ ...item, getAttachments: () => [2, 3] });
  requestedAttachment = undefined;
  await multiple.run();
  assert.equal(multiple.status, "waiting");
  assert.equal(multiple.executing, false);
  assert.equal(multiple.attachmentID, undefined);
  assert.equal(
    requestedAttachment,
    undefined,
    "wait for PDF choice before sending",
  );
  assert.equal(multiple.selectAttachment(3), true);
  await multiple.run();
  assert.equal(
    requestedAttachment,
    3,
    "use the PDF chosen before the first run",
  );
  task.message = "";
  task.reportError(new Error("HTTP 500: private provider response"));
  assert.equal(task.message, "ai-recognition-failed");
  task.message = "";
  task.reportError(new Error("metadata-update-stale"));
  assert.equal(task.message, "metadata-update-stale");
  const { TaskRunner } = load(
    "src/utils/task.ts",
    {
      "../modules/metadata/task": { MetadataTask },
      "../modules/outline/task": { OutlineTask: class {} },
      "../modules/services": {},
      "../modules/attachments": {},
      "./locale": { getString: (k) => k },
      "../../package.json": { version: "test" },
    },
    globals,
  );
  globals.addon.data.progress.addTaskToProgressWindow = async () => {};
  const runner = new TaskRunner();
  gate = new Promise((r) => (release = r));
  const active = new MetadataTask(item);
  const pending = runner.addTask(active);
  await new Promise((r) => setImmediate(r));
  runner.clearTasks();
  assert.equal(runner.tasks.length, 0);
  assert.equal(request.signal.aborted, true);
  release();
  await pending;
  gate = undefined;
  assert.equal(active.candidate, undefined);
  const replacement = new MetadataTask(item);
  await runner.addTask(replacement);
  assert.equal(replacement.status, "success");
  const { addMetadataControls, updateMetadataControls } = load(
    "src/modules/metadata/taskView.ts",
    {
      "./task": { MetadataTask },
      "../../utils/locale": { getString: (key) => key },
      "../outline/buttonIcon": { setOutlineButtonIcon() {} },
      "./updateDialog": {},
    },
    globals,
  );
  const elements = [];
  const doc = {
    createElement() {
      const element = {
        style: {},
        children: [],
        setAttribute() {},
        append(...nodes) {
          this.children.push(...nodes);
        },
      };
      elements.push(element);
      return element;
    },
    getElementById: (id) => elements.find((e) => e.id === id),
  };
  const row = {
    ownerDocument: doc,
    querySelector: () => ({ prepend() {}, append() {} }),
    append() {},
  };
  const pickerTask = new MetadataTask({
    ...item,
    id: 10,
    getAttachments: () => [2, 3],
  });
  const pickerRunner = new TaskRunner();
  globals.addon.taskRunner = pickerRunner;
  addMetadataControls(pickerTask, row);
  await pickerRunner.addTask(pickerTask);
  updateMetadataControls(pickerTask, doc);
  const picker = doc.getElementById(`metadata-pdf-${pickerTask.id}`);
  assert.equal(
    picker.disabled,
    false,
    "PDF picker is enabled while waiting for a choice",
  );
  assert.equal(picker.value, "");
  picker.value = "3";
  gate = new Promise((r) => (release = r));
  const selectedRun = picker.onchange();
  await new Promise((r) => setImmediate(r));
  updateMetadataControls(pickerTask, doc);
  assert.equal(requestedAttachment, 3);
  assert.equal(picker.disabled, true, "PDF cannot change during a request");
  release();
  await selectedRun;
  gate = undefined;
  updateMetadataControls(pickerTask, doc);
  assert.equal(picker.disabled, false);
  assert.equal(pickerTask.canReview, true);
  assert.equal(pickerTask.candidate.source.attachmentID, 3);
  const firstCandidate = pickerTask.candidate;
  assert.equal(
    pickerTask.selectAttachment(3),
    false,
    "same PDF keeps its review",
  );
  assert.equal(pickerTask.candidate, firstCandidate);
  assert.equal(
    pickerTask.selectAttachment(999),
    false,
    "reject unrelated PDFs",
  );
  const writesBeforeSwitch = writes.length;
  gate = new Promise((r) => (release = r));
  picker.value = "2";
  const switchedRun = picker.onchange();
  assert.equal(
    pickerTask.candidate,
    undefined,
    "switch must discard old PDF results immediately",
  );
  assert.equal(pickerTask.snapshot, undefined);
  assert.equal(pickerTask.changes.length, 0);
  assert.equal(pickerTask.undoChanges.length, 0);
  assert.equal(pickerTask.canApply, false);
  assert.equal(pickerTask.canReview, false);
  updateMetadataControls(pickerTask, doc);
  assert.equal(
    doc.getElementById(`metadata-review-open-${pickerTask.id}`).disabled,
    true,
  );
  await pickerTask.apply();
  assert.equal(
    writes.length,
    writesBeforeSwitch,
    "cannot save old values after switching",
  );
  await new Promise((r) => setImmediate(r));
  assert.equal(
    requestedAttachment,
    2,
    "switch automatically recognizes the new PDF",
  );
  assert.equal(
    pickerTask.selectAttachment(3),
    false,
    "cannot switch during recognition",
  );
  assert.equal(pickerTask.attachmentID, 2);
  release();
  await switchedRun;
  gate = undefined;
  assert.equal(pickerTask.candidate.source.attachmentID, 2);
  assert.notEqual(pickerTask.candidate, firstCandidate);
  assert.equal(pickerTask.canReview, true);
  const savingNewPDF = pickerTask.apply();
  assert.equal(
    pickerTask.selectAttachment(3),
    false,
    "cannot switch during save",
  );
  await savingNewPDF;
  assert.equal(
    writes.at(-1).find((c) => c.field === "volume").after,
    "42",
    "only the new PDF's values may be written",
  );
  // Even a mismatched candidate introduced outside the picker cannot be saved.
  await pickerTask.undo();
  pickerTask.candidate.source.attachmentID = 3;
  assert.equal(pickerTask.canReview, false);
  assert.equal(pickerTask.canApply, false);
  const writesBeforeMismatch = writes.length;
  await pickerTask.apply();
  assert.equal(writes.length, writesBeforeMismatch);
  pickerTask.candidate.source.attachmentID = 2;
  recognitionError = new Error("new PDF recognition failed");
  picker.value = "3";
  await picker.onchange();
  assert.equal(pickerTask.status, "fail");
  assert.equal(
    pickerTask.candidate,
    undefined,
    "new request failure cannot restore old results",
  );
  assert.equal(pickerTask.canApply, false);
  assert.equal(pickerTask.canReview, false);
  recognitionError = undefined;
  await pickerRunner.retryMetadataTask(pickerTask);
  pickerTask.changes = pickerTask.changes.filter(
    (c) => typeof c.after === "string",
  );
  const reviewWindows = [];
  const initializers = [];
  globals.Zotero.ItemFields = { getLocalizedString: (field) => field };
  globals.Zotero.getMainWindow = () => ({
    AbortController,
    openDialog(_url, _name, _features, options) {
      const nodes = [];
      const node = (tag) => ({
        tagName: tag,
        children: [],
        append(...children) {
          this.children.push(...children);
        },
        setAttribute() {},
        querySelectorAll(selector) {
          return this.children
            .flatMap((child) => [child, ...child.querySelectorAll("*")])
            .filter(
              (child) =>
                selector === "*" || selector.split(",").includes(child.tagName),
            );
        },
      });
      const root = node("div");
      const unload = [];
      const win = {
        closed: false,
        nodes,
        document: {
          getElementById: () => root,
          createElementNS(_namespace, tag) {
            const element = node(tag);
            nodes.push(element);
            return element;
          },
        },
        addEventListener(_event, callback) {
          unload.push(callback);
        },
        close() {
          this.closed = true;
          for (const callback of unload) callback();
        },
        focus() {},
      };
      reviewWindows.push(win);
      initializers.push(() => options.init(win));
      return win;
    },
  });
  const { openMetadataReview } = load(
    "src/modules/metadata/updateDialog.ts",
    {
      "../../../package.json": { config: { addonRef: "jasminum" } },
      "../../utils/locale": { getString: (key) => key },
    },
    globals,
  );
  openMetadataReview(pickerTask);
  initializers.at(-1)();
  const oldReview = reviewWindows.at(-1);
  assert.equal(oldReview.closed, false);
  const staleSave = oldReview.nodes.find(
    (node) => node.textContent === "metadata-update-save",
  ).onclick;
  const writesBeforeReviewSwitch = writes.length;
  picker.value = "2";
  gate = new Promise((r) => (release = r));
  const reviewSwitch = picker.onchange();
  assert.equal(
    oldReview.closed,
    true,
    "an open review closes as soon as its PDF changes",
  );
  release();
  await reviewSwitch;
  gate = undefined;
  assert.equal(pickerTask.canApply, true);
  await staleSave();
  assert.equal(
    writes.length,
    writesBeforeReviewSwitch,
    "a stale review cannot save a newer candidate",
  );
  // A switch while openDialog is loading must close before rendering stale fields.
  openMetadataReview(pickerTask);
  const loadingReview = reviewWindows.at(-1);
  assert.equal(pickerTask.selectAttachment(3), true);
  initializers.at(-1)();
  assert.equal(loadingReview.closed, true);
  assert.equal(loadingReview.nodes.length, 0);
  console.log("Metadata task tests passed");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
