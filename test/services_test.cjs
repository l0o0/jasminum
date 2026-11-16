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

function setup() {
  let nextID = 1;
  const items = new Map();
  let database = new Map();
  const calls = [];
  const answers = {};
  const config = {
    sources: ["PubScholar", "AI", "CNKI"],
    query: { title: "测试论文" },
    pattern: "custom",
    pdfTitle: "测试论文",
    recognition: { metadata: { itemType: "journalArticle", title: "AI 论文" } },
    automaticTags: true,
    translation: async () => ({ status: "success", items: [createItem()] }),
  };

  class Item {
    constructor(type = "journalArticle") {
      this.id = undefined;
      this.itemType = type;
      this.libraryID = 8;
      this.parentID = null;
      this.fields = { title: "测试论文" };
      this.collections = [];
      this.tags = [{ tag: "关键词" }];
      this.notes = [];
      this.deleted = false;
      this.editable = true;
    }
    isEditable() {
      return this.editable;
    }
    get itemTypeID() {
      return this.itemType;
    }
    setType(type) {
      this.itemType = type;
    }
    isTopLevelItem() {
      return !this.parentID;
    }
    isPDFAttachment() {
      return this.itemType === "attachment";
    }
    get parentItem() {
      return items.get(this.parentID);
    }
    getCollections() {
      return this.collections;
    }
    setCollections(ids) {
      this.collections = Array.from(ids);
    }
    addToCollection(id) {
      if (!this.collections.includes(id)) this.collections.push(id);
    }
    getTags() {
      return this.tags;
    }
    setTags(tags) {
      this.tags = Array.from(tags);
    }
    removeAllTags() {
      this.tags = [];
    }
    getNotes() {
      return this.notes.filter((id) => database.has(id));
    }
    getField(name) {
      return this.fields[name] || "";
    }
    setField(name, value) {
      this.fields[name] = value;
    }
    toJSON() {
      return { itemType: this.itemType, ...this.fields };
    }
    fromJSON(data) {
      const { itemType, ...fields } = data;
      this.itemType = itemType;
      this.fields = { ...fields };
    }
    snapshot() {
      return structuredClone({
        parentID: this.parentID,
        itemType: this.itemType,
        fields: this.fields,
        collections: this.collections,
        tags: this.tags,
        notes: this.notes,
      });
    }
    async save() {
      if (!this.id) {
        this.id = nextID++;
        items.set(this.id, this);
      }
      database.set(this.id, this.snapshot());
      calls.push(`save:${this.id}`);
      await this.onSave?.();
      return this.id;
    }
    async reload(dataTypes) {
      calls.push(`reload:${this.id}`);
      if (dataTypes.includes("childItems"))
        calls.push(`reload-children:${this.id}`);
      if (this.itemType !== database.get(this.id).itemType)
        throw new Error("Cannot change type in loadIn mode");
      Object.assign(this, structuredClone(database.get(this.id)));
    }
    async erase() {
      await this.onErase?.();
      calls.push(`erase:${this.id}`);
      database.delete(this.id);
    }
    async eraseTx() {
      await this.erase();
    }
  }
  function createItem(type = "journalArticle") {
    const item = new Item(type);
    item.id = nextID++;
    items.set(item.id, item);
    database.set(item.id, item.snapshot());
    return item;
  }
  function task(type = "attachment") {
    const item = createItem(type === "snapshot" ? "webpage" : "attachment");
    item.attachmentFilename = "测试论文_测试作者.pdf";
    item.collections = [4, 5];
    database.set(item.id, item.snapshot());
    return {
      item,
      type,
      status: "processing",
      cancelled: false,
      searchResults: [],
      messages: [],
      addMsg(message) {
        this.messages.push(message);
      },
    };
  }
  function provider(name) {
    return class {
      async search(option) {
        calls.push(`search:${name}`);
        assert.equal(option.title, config.query.title);
        const answer = answers[name];
        if (typeof answer === "function") return answer();
        if (answer instanceof Error) throw answer;
        return answer || [];
      }
      async searchSnapshot() {
        return answers.snapshot || [];
      }
      async translate(result, libraryID, saveAttachments) {
        calls.push(`translate:${name}`);
        assert.equal(libraryID, 8);
        assert.equal(saveAttachments, false);
        return config.translation(result);
      }
    };
  }
  const globals = {
    Zotero: {
      Item,
      Items: { get: (id) => items.get(id) },
      Prefs: { get: () => config.automaticTags },
      DB: {
        async executeTransaction(callback) {
          const before = structuredClone(database);
          try {
            return await callback();
          } catch (error) {
            database = before;
            throw error;
          }
        },
      },
    },
    ztoolkit: {
      log() {},
      ExtraField: {
        setExtraField: (item, key, value) => item.setField(key, value),
      },
    },
    addon: { data: { progress: { updateTaskStatus() {} } } },
  };
  const services = load(
    "src/modules/services/index.ts",
    {
      "./cnki": { CNKI: provider("CNKI") },
      "./pubscholar": { PubScholar: provider("PubScholar") },
      "./ncpssd": { NCPSSD: provider("NCPSSD") },
      "./yiigle": { Yiigle: provider("Yiigle") },
      "./wanfangdata": { WanfangData: provider("WanFangData") },
      "./douban": { Douban: provider("Douban") },
      "./wenjin": { Wenjin: provider("Wenjin") },
      "./searchChain": load("src/modules/services/searchChain.ts", {}, globals),
      "./importItem": load("src/modules/services/importItem.ts", {}, globals),
      "string-similarity": require("string-similarity"),
      "../../utils/locale": { getString: (key) => key },
      "../../utils/detect": {
        isChineseTopAttachment: (item) =>
          item.isPDFAttachment() && item.isTopLevelItem(),
        isChinsesSnapshot: (item) => item.itemType === "webpage",
      },
      "../../utils/prefs": {
        getMetadataSources: () => config.sources,
        getPref: (name) => (name === "namePattern" ? config.pattern : "0.6"),
      },
      "../../utils/pattern": {
        getArgsFromPattern() {
          calls.push("query");
          return config.query;
        },
      },
      "../../utils/pdfParser": {
        async getPDFTitle() {
          calls.push("pdfTitle");
          return config.pdfTitle;
        },
      },
      "../../utils/llm": { getConfiguredLLMClient: () => ({}) },
      "../../utils/pdfMetadata": {
        async recognizePDFAttachment() {
          calls.push("AI");
          if (config.recognition instanceof Error) throw config.recognition;
          return config.recognition;
        },
      },
    },
    globals,
  );
  return {
    services,
    config,
    answers,
    calls,
    task,
    createItem,
    persisted: (id) => database.get(id),
  };
}

const result = (source = "CNKI", title = "测试论文") => ({
  source,
  title,
  articleTitle: title,
  url: "https://example.com/paper",
});

async function testSearch() {
  const { services, config, answers, calls, task } = setup();
  const current = task();
  answers.PubScholar = [result("PubScholar")];
  await services.metaSearch(current);
  assert.deepEqual(calls, ["query", "search:PubScholar"]);
  assert.equal(current.searchResults.length, 1);
  assert.equal(current.status, "processing");

  answers.PubScholar = new Error("offline");
  await services.metaSearch(current);
  assert.equal(current.aiMetadata.title, "AI 论文");
  assert.equal(
    current.searchResults.length,
    0,
    "discard the previous search's candidates",
  );
  assert(!calls.includes("search:CNKI"));

  config.recognition = new Error("secret-key response body");
  answers.CNKI = [result()];
  await services.metaSearch(current);
  assert.equal(current.aiMetadata, undefined);
  assert.equal(current.searchResults[0].source, "CNKI");
  assert(!current.messages.join().includes("secret-key"));

  config.sources = ["AI", "CNKI"];
  config.recognition = {
    metadata: { itemType: "journalArticle", title: "AI first" },
  };
  calls.length = 0;
  await services.metaSearch(current);
  assert.deepEqual(
    calls,
    ["AI"],
    "AI-first recognition needs no filename or PDF-title parsing",
  );

  config.sources = ["PubScholar", "AI", "CNKI"];
  answers.PubScholar = [result("PubScholar", "测试论文的补充说明")];
  calls.length = 0;
  await services.metaSearch(current);
  assert(
    !calls.includes("AI"),
    "reliable earlier results take precedence over AI",
  );
  assert.equal(current.status, "multiple_results");

  config.sources = ["Unknown", "WanFangData", "Douban", "Yiigle"];
  answers.Yiigle = [result("中华医学")];
  calls.length = 0;
  await services.metaSearch(current);
  assert.deepEqual(calls, ["query", "search:Yiigle"]);
  assert.equal(current.searchResults[0].source, "中华医学");

  config.sources = ["CNKI"];
  answers.CNKI = () => {
    current.cancelled = true;
    return [result()];
  };
  await services.metaSearch(current);
  assert.equal(
    current.searchResults.length,
    0,
    "cancelled website results stay discarded",
  );
}

async function testArticleImport() {
  const { services, config, calls, task, createItem, persisted } = setup();
  const current = task();
  const imported = createItem();
  imported.collections = [6];
  const note = createItem("note");
  note.onErase = () => new Promise((resolve) => setImmediate(resolve));
  imported.notes = [note.id];
  current.searchResults = [
    { ...result("中华医学"), citation: 12, netFirst: 1, date: "2025" },
  ];
  config.translation = async () => ({ status: "success", items: [imported] });
  await services.metaTranslate(current);
  assert.equal(current.status, "success");
  assert(calls.includes("translate:Yiigle"));
  assert.equal(current.item.parentID, imported.id);
  assert.deepEqual(imported.collections, [6, 4, 5]);
  assert.equal(imported.tags[0].type, 1);
  assert.equal(persisted(imported.id).fields.CNKICite, "12");
  assert.equal(
    persisted(imported.id).fields.Status,
    "advance online publication",
  );
  assert.equal(persisted(imported.id).fields.date, "2025");
  assert.equal(persisted(note.id), undefined);
  assert(
    calls.indexOf(`erase:${note.id}`) < calls.indexOf(`save:${imported.id}`),
  );

  const legacy = task();
  legacy.searchResults = [result("万方数据")];
  await services.metaTranslate(legacy);
  assert(
    calls.includes("translate:WanFangData"),
    "legacy result labels still resolve",
  );

  const wrongSource = task("book");
  wrongSource.searchResults = [result("CNKI")];
  await services.metaTranslate(wrongSource);
  assert.equal(wrongSource.status, "fail");
  assert.match(wrongSource.messages.join(), /Unsupported source/);
}

async function testImportFailureAndCancellation() {
  const { services, config, task, createItem, persisted, calls } = setup();
  const failure = task();
  const imported = createItem();
  failure.searchResults = [result()];
  failure.item.onSave = () => {
    throw new Error("save failed");
  };
  config.translation = async () => ({ status: "success", items: [imported] });
  await services.metaTranslate(failure);
  assert.equal(failure.status, "fail");
  assert.equal(failure.item.parentID, null);
  assert.equal(persisted(failure.item.id).parentID, null);
  assert.equal(persisted(imported.id), undefined);

  const cancelled = task();
  const abandoned = createItem();
  cancelled.searchResults = [result()];
  config.translation = async () => {
    cancelled.cancelled = true;
    return { status: "success", items: [abandoned] };
  };
  await services.metaTranslate(cancelled);
  assert.equal(persisted(abandoned.id), undefined);
  assert.equal(cancelled.item.parentID, null);

  const duringSave = task();
  const rolledBack = createItem();
  duringSave.searchResults = [result()];
  duringSave.item.onSave = () => {
    duringSave.cancelled = true;
  };
  config.translation = async () => ({ status: "success", items: [rolledBack] });
  await services.metaTranslate(duringSave);
  assert.equal(duringSave.item.parentID, null);
  assert.equal(persisted(duringSave.item.id).parentID, null);
  assert.equal(persisted(rolledBack.id), undefined);
  assert(calls.includes(`reload-children:${rolledBack.id}`));

  const multiple = task();
  const extraItems = [createItem(), createItem()];
  multiple.searchResults = [result()];
  config.translation = async () => ({ status: "success", items: extraItems });
  await services.metaTranslate(multiple);
  assert.equal(multiple.status, "fail");
  assert(extraItems.every((item) => !persisted(item.id)));

  const changed = task();
  const unused = createItem();
  changed.searchResults = [result()];
  config.translation = async () => {
    changed.item.parentID = 999;
    await changed.item.save();
    return { status: "success", items: [unused] };
  };
  await services.metaTranslate(changed);
  assert.equal(changed.status, "fail");
  assert.equal(changed.item.parentID, 999);
  assert.equal(persisted(unused.id), undefined);

  const alreadyCancelled = task();
  alreadyCancelled.cancelled = true;
  calls.length = 0;
  await services.metaTranslate(alreadyCancelled);
  assert.deepEqual(calls, []);
}

async function testSnapshotsAndAI() {
  const { services, config, task, createItem, persisted, calls } = setup();
  const topLevel = task("snapshot");
  const translated = createItem("journalArticle");
  translated.fields.title = "更新后的网页";
  topLevel.searchResults = [result()];
  config.translation = async () => ({ status: "success", items: [translated] });
  await services.metaTranslate(topLevel);
  assert.equal(topLevel.status, "success");
  assert.equal(topLevel.item.getField("title"), "更新后的网页");
  assert.equal(persisted(translated.id), undefined);
  assert.equal(persisted(topLevel.item.id).itemType, "journalArticle");

  const snapshotFailure = task("snapshot");
  const failedReplacement = createItem("journalArticle");
  snapshotFailure.searchResults = [result()];
  snapshotFailure.item.onSave = () => {
    throw new Error("snapshot save failed");
  };
  config.translation = async () => ({
    status: "success",
    items: [failedReplacement],
  });
  await services.metaTranslate(snapshotFailure);
  assert.equal(snapshotFailure.status, "fail");
  assert.equal(snapshotFailure.item.itemType, "webpage");
  assert.equal(snapshotFailure.item.getField("title"), "测试论文");
  assert.equal(persisted(failedReplacement.id), undefined);

  const nested = task("snapshot");
  const oldParent = createItem("webpage");
  oldParent.collections = [10];
  nested.item.parentID = oldParent.id;
  await nested.item.save();
  const newParent = createItem();
  nested.searchResults = [result()];
  config.translation = async () => ({ status: "success", items: [newParent] });
  await services.metaTranslate(nested);
  assert.equal(nested.status, "success");
  assert.equal(nested.item.parentID, newParent.id);
  assert.deepEqual(newParent.collections, [10]);
  assert.equal(persisted(oldParent.id), undefined);

  const cancelledSnapshot = task("snapshot");
  const retainedParent = createItem("webpage");
  cancelledSnapshot.item.parentID = retainedParent.id;
  await cancelledSnapshot.item.save();
  cancelledSnapshot.searchResults = [result()];
  const cancelledReplacement = createItem();
  retainedParent.onErase = () => {
    cancelledSnapshot.cancelled = true;
  };
  config.translation = async () => ({
    status: "success",
    items: [cancelledReplacement],
  });
  await services.metaTranslate(cancelledSnapshot);
  assert.equal(cancelledSnapshot.item.parentID, retainedParent.id);
  assert(persisted(retainedParent.id));
  assert(calls.includes(`reload-children:${retainedParent.id}`));
  assert.equal(persisted(cancelledReplacement.id), undefined);

  const ai = task();
  ai.aiMetadata = { itemType: "journalArticle", title: "AI 标题" };
  await services.metaTranslate(ai);
  assert.equal(ai.status, "success");
  assert.equal(persisted(ai.item.parentID).fields.title, "AI 标题");

  const aiFailure = task();
  aiFailure.aiMetadata = {
    itemType: "journalArticle",
    title: "失败的 AI 结果",
  };
  let newID;
  aiFailure.item.onSave = () => {
    newID = aiFailure.item.parentID;
    throw new Error("save failed");
  };
  await services.metaTranslate(aiFailure);
  assert.equal(aiFailure.status, "fail");
  assert.equal(aiFailure.item.parentID, null);
  assert.equal(persisted(newID), undefined);
  assert(aiFailure.messages.includes("ai-recognition-save-failed"));
}

(async () => {
  await testSearch();
  await testArticleImport();
  await testImportFailureAndCancellation();
  await testSnapshotsAndAI();
  console.log(
    "Metadata source dispatch, search ordering, transactional import and cancellation passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
