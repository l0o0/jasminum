const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, URL, Error, require: (name) => mocks[name], ...globals },
  );
  return exports;
}

const utilities = {
  Internal: { md5: String },
};

async function testSources() {
  const requests = [];
  let document;
  const translatorCalls = [];
  class Web {
    setTranslator(translator) {
      this.id = translator.translatorID;
    }
    setDocument(doc) {
      this.document = doc;
    }
    async translate(options) {
      translatorCalls.push({ id: this.id, document: this.document, options });
      return [{ itemType: "book" }];
    }
  }
  const mocks = {
    "../../utils/http": {
      requestDocument: async (url) => {
        requests.push(url);
        return document;
      },
    },
    "../translators": {
      ensureTranslator: async (translatorID) => ({ translatorID }),
    },
  };
  const globals = {
    Zotero: { Utilities: utilities, Translate: { Web } },
    ztoolkit: { log() {} },
  };
  const { Douban, doubanBookURL } = load(
    "src/modules/services/douban.ts",
    mocks,
    globals,
  );
  const { Wenjin, wenjinBookURL } = load(
    "src/modules/services/wenjin.ts",
    mocks,
    globals,
  );
  const bookURL = "https://book.douban.com/subject/36892731/";
  const wrapped = `https://www.douban.com/link2/?url=${encodeURIComponent(bookURL)}`;
  assert.equal(doubanBookURL(wrapped), bookURL);
  assert.equal(doubanBookURL(`${bookURL}?from=search`), bookURL);
  assert.equal(doubanBookURL("https://movie.douban.com/subject/1/"), null);
  assert.equal(doubanBookURL("https://book.douban.com.evil/subject/1/"), null);
  assert.equal(
    wenjinBookURL("https://find.nlc.cn/search/doSearch?query=x"),
    null,
  );
  const wenjinURL =
    "https://find.nlc.cn/search/showDocDetails?docId=123&dataSource=ucs01";
  assert.equal(
    wenjinBookURL(wenjinURL.replace("https", "http")),
    wenjinURL.replace("https", "http"),
  );
  assert.equal(
    wenjinBookURL(wenjinURL.replace("find.nlc.cn", "example.com")),
    null,
  );
  const anchor = (href, text, info) => ({
    href,
    textContent: text,
    closest: () => ({
      textContent: info,
      querySelector: (selector) => ({
        textContent: selector === ".book_type > .book_val" ? "专著" : info,
      }),
      querySelectorAll: () => [{ textContent: info }],
    }),
  });
  document = {
    location: { href: "https://www.douban.com/search?cat=1001&q=三体" },
    title: "搜索结果",
    querySelectorAll: (selector) => {
      assert.equal(selector, ".result .title h3 a");
      return [
        anchor(wrapped, "三体", "刘慈欣 / 重庆出版社 / 2008"),
        anchor(bookURL, "三体", "刘慈欣 / 重庆出版社 / 2008"),
        anchor("https://movie.douban.com/subject/1/", "三体", "电影"),
      ];
    },
  };
  const douban = new Douban();
  const found = await douban.search({ title: "三体" });
  assert.equal(found.length, 1);
  assert.equal(found[0].articleTitle, "三体");
  assert(found[0].title.includes("重庆出版社"));
  assert.equal(new URL(requests.at(-1)).pathname, "/search");
  assert.equal(new URL(requests.at(-1)).searchParams.get("q"), "三体");
  document = {
    location: { href: bookURL },
    querySelector: () => ({ textContent: "三体" }),
  };
  assert.equal((await douban.translate(found[0], 8, false)).status, "success");
  assert.equal(
    translatorCalls.at(-1).id,
    "fc353b26-8911-4c34-9196-f6f567c93901",
  );
  assert.deepEqual(
    { ...translatorCalls.at(-1).options },
    { libraryID: 8, saveAttachments: false },
  );
  const wenjin = new Wenjin();
  document = {
    title: "文津搜索",
    querySelectorAll: (selector) => {
      assert.equal(selector, "div.article_item div.book_name > a");
      return [anchor(wenjinURL, "三体", "三体 刘慈欣 重庆出版社")];
    },
  };
  const national = await wenjin.search({ title: "三体" });
  assert.equal(new URL(requests.at(-1)).searchParams.get("query"), "三体");
  assert.equal(
    new URL(requests.at(-1)).searchParams.get("actualQuery"),
    "三体",
  );
  document.querySelectorAll = () => [
    {
      ...anchor("javascript:void(0);", "三体", "三体 刘慈欣 重庆出版社"),
      getAttribute: () =>
        "makeDetailUrl(this, '/search/showDocDetails?', '3867927182232002592', 'ucs01', '三体');",
    },
  ];
  const generated = await wenjin.search({ title: "三体" });
  assert.equal(
    new URL(generated[0].url).searchParams.get("docId"),
    "3867927182232002592",
  );
  assert.equal(
    new URL(generated[0].url).searchParams.get("dataSource"),
    "ucs01",
  );
  document = { querySelector: () => ({ textContent: "学位论文" }) };
  assert.equal((await wenjin.translate(national[0], 8, false)).status, "empty");
  document = { querySelector: () => ({ textContent: "专著" }) };
  assert.equal(
    (await wenjin.translate(national[0], 8, false)).status,
    "success",
  );
  assert.equal(
    translatorCalls.at(-1).id,
    "f306107f-dabb-41ac-8fa2-f7f858feb11f",
  );
  document = {
    title: "异常请求验证",
    location: { href: "https://sec.douban.com/" },
    querySelectorAll: () => [],
  };
  await assert.rejects(douban.search({ title: "三体" }), /verification/);
}

async function testWorkflow() {
  let pattern = "title",
    pdfTitle = "三体",
    workerCalls = 0;
  const sourceCalls = [];
  const answers = { Douban: [], Wenjin: [] };
  let translate;
  class Douban {
    async search(option) {
      sourceCalls.push({ source: "Douban", option });
      if (answers.Douban instanceof Error) throw answers.Douban;
      return answers.Douban;
    }
    translate(...args) {
      return translate(...args);
    }
  }
  class Wenjin extends Douban {
    async search(option) {
      sourceCalls.push({ source: "Wenjin", option });
      return answers.Wenjin;
    }
  }
  let persistedParent = null;
  const globals = {
    Zotero: {
      Utilities: utilities,
      getMainWindow: () => ({ AbortController }),
      PDFWorker: {
        async getFullText() {
          workerCalls++;
          throw new Error("Unexpected PDF full-text extraction");
        },
      },
      Prefs: { get: () => true },
      DB: {
        async executeTransaction(callback) {
          const before = persistedParent;
          try {
            return await callback();
          } catch (error) {
            persistedParent = before;
            throw error;
          }
        },
      },
    },
    ztoolkit: { log() {} },
    addon: {
      data: {
        progress: {
          addTaskToProgressWindow: async () => {},
          updateTaskStatus() {},
          updateTaskSearchResult() {},
        },
      },
    },
  };
  const locale = { getString: (key) => key };
  const services = load(
    "src/modules/services/index.ts",
    {
      "../../utils/prefs": {
        getPref: (key) => (key === "namePattern" ? pattern : "0.6"),
      },
      "../../utils/locale": locale,
      "../../utils/pattern": {
        getArgsFromPattern: (name) => ({ title: name.replace(/\.pdf$/i, "") }),
      },
      "../../utils/pdfParser": { getPDFTitle: async () => pdfTitle },
      "string-similarity": require("string-similarity"),
      "./searchChain": load("src/modules/services/searchChain.ts", {}),
      "./importItem": load("src/modules/services/importItem.ts", {}, globals),
      "./cnki": { CNKI: class {} },
      "./pubscholar": { PubScholar: class {} },
      "./ncpssd": { NCPSSD: class {} },
      "./yiigle": { Yiigle: class {} },
      "./wanfangdata": { WanfangData: class {} },
      "../../utils/detect": {},
      "../../utils/llm": {},
      "../../utils/pdfMetadata": {},
      "./douban": { Douban },
      "./wenjin": { Wenjin },
    },
    globals,
  );
  const { ScraperTask, TaskRunner } = load(
    "src/utils/task.ts",
    {
      "../modules/metadata/task": { MetadataTask: class {} },
      "../modules/outline/task": { OutlineTask: class {} },
      "../modules/services": {
        metaSearch: services.metaSearch,
        metaTranslate: services.metaTranslate,
      },
      "../modules/attachments": {},
      "./locale": locale,
      "../../package.json": { version: "test" },
    },
    globals,
  );
  function attachment(filename = "三体.pdf") {
    return {
      id: 1,
      libraryID: 8,
      attachmentFilename: filename,
      parentID: null,
      isPDFAttachment: () => true,
      isTopLevelItem() {
        return this.parentID === null;
      },
      isEditable: () => true,
      getCollections: () => [4, 5],
      getField: () => filename,
      async save() {
        persistedParent = this.parentID;
      },
      async reload() {
        this.parentID = persistedParent;
      },
    };
  }
  function book() {
    return {
      id: 100,
      itemType: "book",
      erased: false,
      creators: [{ firstName: "慈欣", lastName: "刘", creatorType: "author" }],
      notes: ["目录"],
      setCollections(ids) {
        this.collections = ids;
      },
      getTags: () => [{ tag: "科幻" }],
      setTags(tags) {
        this.tags = tags;
      },
      removeAllTags() {
        this.tags = [];
      },
      async save() {},
      async reload() {},
      async eraseTx() {
        this.erased = true;
      },
    };
  }
  const result = (source, title = "三体") => ({
    source,
    title,
    articleTitle: title,
    url: "test",
  });
  assert.deepEqual(
    { ...(await services.getBookSearchOption(attachment())) },
    { title: "三体" },
  );
  assert.equal(workerCalls, 0, "a book title is sufficient for a search");
  await assert.rejects(
    services.getBookSearchOption(attachment(".pdf")),
    /no-query/,
  );
  pattern = "auto";
  assert.equal(
    (await services.getBookSearchOption(attachment("未知.pdf"))).title,
    "三体",
  );
  pdfTitle = "";
  assert.equal(
    (await services.getBookSearchOption(attachment("三体.pdf"))).title,
    "三体",
  );
  pattern = "title";
  assert.equal(
    services.canRetrieveBookMetadata({ ...attachment(), parentID: 2 }),
    false,
  );
  answers.Douban = new Error("offline");
  answers.Wenjin = [result("Wenjin")];
  const fallback = new ScraperTask(attachment(), "book");
  await services.metaSearch(fallback);
  assert.equal(sourceCalls.at(-1).source, "Wenjin");
  assert.equal(fallback.searchResults.length, 1);
  assert(
    sourceCalls.every(({ option }) => Object.keys(option).join() === "title"),
  );
  answers.Douban = [result("Douban", "完全不同的书")];
  await services.metaSearch(fallback);
  assert.equal(
    fallback.searchResults[0].source,
    "Wenjin",
    "discard unrelated titles",
  );
  answers.Douban = [result("Douban")];
  sourceCalls.length = 0;
  await services.metaSearch(fallback);
  assert.equal(
    sourceCalls.length,
    2,
    "query both sources for matching editions",
  );
  assert.equal(fallback.searchResults.length, 2);
  const imported = book();
  translate = async () => ({ status: "success", items: [imported] });
  await services.metaTranslate(fallback);
  assert.equal(fallback.status, "success");
  assert.equal(fallback.item.parentID, imported.id);
  assert.deepEqual(imported.collections, [4, 5]);
  assert.equal(imported.tags[0].type, 1);
  assert.deepEqual(imported.notes, ["目录"]);
  assert.equal(imported.creators[0].lastName, "刘");
  const taskForImport = () => {
    persistedParent = null;
    const task = new ScraperTask(attachment(), "book");
    task.searchResults = [result("Douban")];
    return task;
  };
  const wrongType = taskForImport(),
    article = book();
  article.itemType = "journalArticle";
  translate = async () => ({ status: "success", items: [article] });
  await services.metaTranslate(wrongType);
  assert.equal(wrongType.status, "fail");
  assert.match(wrongType.message, /not-book/);
  assert(article.erased);
  const cancelled = taskForImport(),
    cancelledBook = book();
  translate = async () => {
    cancelled.stop();
    return { status: "success", items: [cancelledBook] };
  };
  await services.metaTranslate(cancelled);
  assert(cancelledBook.erased);
  assert.equal(cancelled.item.parentID, null);
  const duringSave = taskForImport(),
    rolledBack = book();
  translate = async () => ({ status: "success", items: [rolledBack] });
  duringSave.item.save = async () => {
    persistedParent = duringSave.item.parentID;
    duringSave.stop();
  };
  await services.metaTranslate(duringSave);
  assert.equal(persistedParent, null);
  assert.equal(duringSave.item.parentID, null);
  assert(rolledBack.erased);
  const runner = new TaskRunner();
  globals.addon.taskRunner = runner;
  answers.Douban = [result("Douban")];
  answers.Wenjin = [result("Wenjin")];
  const candidate = runner.createTask(attachment(), "book");
  assert.notEqual(
    candidate.id,
    new ScraperTask(candidate.item, "attachment").id,
  );
  let chosen;
  translate = async (selected) => {
    chosen = selected.source;
    return { status: "success", items: [book()] };
  };
  const pending = runner.addTask(candidate);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(candidate.status, "multiple_results");
  assert.equal(chosen, undefined, "wait for the user's edition choice");
  runner.resumeTask(candidate.id, 1);
  await pending;
  assert.equal(chosen, "Wenjin");
  assert.equal(candidate.status, "success");
}

(async () => {
  await testSources();
  await testWorkflow();
  console.log(
    "Book title searches, translator reuse, result selection and import cleanup passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
