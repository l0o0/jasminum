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
    { exports, require: (n) => mocks[n] ?? require(n), Error, ...globals },
  );
  return exports;
}
const diff = load("src/modules/metadata/diff.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));
const author = { creatorType: "author", firstName: "A", lastName: "One" };
const editor = { creatorType: "editor", name: "Editor" };
const original = {
  itemType: "journalArticle",
  fields: {
    title: "Manual title",
    volume: "",
    DOI: "10.1/original",
    creators: [author, editor],
  },
};
const candidate = {
  itemType: "journalArticle",
  title: "Recognized title",
  volume: " 42 ",
  DOI: null,
  creators: [{ creatorType: "author", name: "New author" }],
  tags: ["bad"],
  extra: "bad",
  key: "bad",
};
const changes = diff.buildChanges(original, candidate);
assert.deepEqual(plain(changes.map((c) => [c.field, c.selected])), [
  ["title", false],
  ["volume", true],
  ["creators", false],
]);
assert.equal(changes[1].after, "42");
assert.deepEqual(plain(changes[2].after), [candidate.creators[0], editor]);
assert.deepEqual(
  plain(
    diff.buildChanges(original, {
      itemType: "journalArticle",
      title: "Manual title",
      creators: [],
      volume: " ",
    }),
  ),
  [],
);
assert.throws(
  () => diff.buildChanges(original, { ...candidate, itemType: "thesis" }),
  /type-conflict/,
);
assert(
  diff.equalValue(
    [author],
    [{ lastName: "One", firstName: "A", creatorType: "author" }],
  ),
);

async function main() {
  let fields = { title: "Manual title", volume: "", DOI: "10.1/original" };
  let creators = [author, editor];
  let saves = 0,
    undo = 0,
    reloads = 0,
    fail = false;
  const untouched = {
    id: 17,
    key: "KEEPKEY",
    attachments: [20],
    notes: [30],
    collections: [40],
    tags: ["manual"],
    extra: "Citation Key: keep",
  };
  const item = {
    ...untouched,
    itemTypeID: 1,
    deleted: false,
    isRegularItem: () => true,
    isEditable: () => true,
    getField: (f) => fields[f] || "",
    getCreatorsJSON: () => creators,
    setField: (f, v) => {
      fields[f] = v;
    },
    setCreators: (v) => {
      creators = v;
    },
    save: async () => {
      if (fail) throw Error("save failure");
      saves++;
    },
    reload: async () => {
      reloads++;
    },
  };
  const Zotero = {
    Items: { get: (id) => (id === 17 ? item : null) },
    ItemTypes: { getName: () => "journalArticle" },
    ItemFields: {
      getID: (f) => f,
      isValidForType: (f) => Object.hasOwn(fields, f),
    },
    DB: {
      executeTransaction: async (fn) => {
        const old = structuredClone(fields),
          oldCreators = structuredClone(creators);
        try {
          await fn();
        } catch (e) {
          fields = old;
          creators = oldCreators;
          throw e;
        }
      },
    },
    UndoHistory: { stageAction: () => undo++ },
  };
  const api = load(
    "src/modules/metadata/apply.ts",
    { "./diff": diff },
    { Zotero },
  );
  const snapshot = api.snapshotItem(item);
  await api.applyChanges(17, snapshot, changes);
  assert.equal(fields.volume, "42");
  assert.equal(fields.title, "Manual title");
  assert.equal(saves, 1);
  assert.equal(undo, 1);
  for (const [key, value] of Object.entries(untouched))
    assert.deepEqual(item[key], value);
  // Unrelated edits do not prevent applying a patch, but selected-field edits do.
  fields.title = "Edited after preview";
  await assert.rejects(
    api.applyChanges(17, snapshot, [
      {
        field: "title",
        before: "Manual title",
        after: "AI title",
        selected: true,
      },
    ]),
    /stale/,
  );
  assert.equal(fields.title, "Edited after preview");
  assert.equal(saves, 1);
  await assert.rejects(
    api.applyChanges(17, snapshot, [
      { field: "extra", before: "", after: "overwrite", selected: true },
    ]),
    /stale/,
  );
  // Restore only the patch, retaining unrelated user edits.
  await api.applyChanges(17, snapshot, [
    { field: "volume", before: "42", after: "", selected: true },
  ]);
  assert.equal(fields.volume, "");
  assert.equal(fields.title, "Edited after preview");
  fail = true;
  await assert.rejects(
    api.applyChanges(17, snapshot, [
      { field: "volume", before: "", after: "99", selected: true },
    ]),
    /save failure/,
  );
  assert.equal(fields.volume, "");
  assert(reloads > 0);
  fail = false;
  item.deleted = true;
  await assert.rejects(api.applyChanges(17, snapshot, changes), /unavailable/);
  console.log("Metadata update tests passed");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
