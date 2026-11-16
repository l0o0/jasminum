const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const DOUBAN = "fc353b26-8911-4c34-9196-f6f567c93901";
const WENJIN = "f306107f-dabb-41ac-8fa2-f7f858feb11f";
const REQUIRED_DOUBAN = "2024-11-15 03:16:28";

function harness() {
  const installed = new Map();
  const files = new Set();
  const downloads = [];
  const saved = [];
  let downloaded;
  let sourceUnavailable = false;
  let reinitialized = 0;
  const state = {
    installed,
    files,
    downloads,
    saved,
    set downloaded(value) {
      downloaded = value;
    },
    set sourceUnavailable(value) {
      sourceUnavailable = value;
    },
    get reinitialized() {
      return reinitialized;
    },
  };
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync("src/modules/translators.ts", "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) =>
      name.endsWith("/prefs")
        ? {
            getPref: () => "https://primary.test/translators_CN/",
          }
        : { getString: (key, options) => `${key}: ${options.args.name}` },
    IOUtils: { exists: async (path) => files.has(path) },
    Zotero: {
      HTTP: {
        request: async (_method, url) => {
          if (!url.startsWith("https://ftp.zotero-chinese.com/"))
            throw new Error("Mirror unavailable");
        },
      },
      File: {
        getContentsFromURLAsync: async (url, options) => {
          assert.equal(options.noCache, true);
          downloads.push(url);
          if (sourceUnavailable && url.startsWith("https://primary.test/"))
            throw new Error("Source unavailable");
          return downloaded;
        },
      },
      Translators: {
        get: async (id) => installed.get(id) || false,
        save: async (metadata, code) => {
          saved.push({ metadata, code });
          state.pending = {
            ...metadata,
            path: `/translators/${metadata.label}.js`,
          };
        },
        reinit: async () => {
          reinitialized++;
          assert(state.pending, "reload after saving the translator");
          installed.set(state.pending.translatorID, state.pending);
          files.add(state.pending.path);
          state.pending = undefined;
        },
      },
    },
    ztoolkit: { log() {} },
  });
  state.ensure = exports.ensureTranslator;
  return state;
}

function translator(id, label, date) {
  return (
    JSON.stringify(
      { translatorID: id, translatorType: 4, label, lastUpdated: date },
      null,
      2,
    ) + "\n\nfunction doWeb() {}\n"
  );
}

async function main() {
  const missing = harness();
  missing.downloaded = translator(WENJIN, "Wenjin", "2025-09-23 02:30:37");
  const wenjin = await missing.ensure(WENJIN, "Wenjin.js");
  assert.equal(wenjin.translatorID, WENJIN);
  assert.equal(missing.reinitialized, 1);
  assert.equal(
    missing.saved[0].code.trim(),
    "function doWeb() {}",
    "save metadata and translator body separately",
  );
  assert.equal(await missing.ensure(WENJIN, "Wenjin.js"), wenjin);
  assert.equal(
    missing.downloads.length,
    1,
    "use the installed translator for later imports",
  );

  const old = harness();
  old.installed.set(DOUBAN, {
    translatorID: DOUBAN,
    lastUpdated: "2024-08-07 08:46:18",
    path: "/translators/Douban.js",
  });
  old.files.add("/translators/Douban.js");
  old.downloaded = translator(DOUBAN, "Douban", REQUIRED_DOUBAN);
  const updated = await old.ensure(DOUBAN, "Douban.js", REQUIRED_DOUBAN);
  assert.equal(updated.lastUpdated, REQUIRED_DOUBAN);
  assert.equal(
    old.saved.length,
    1,
    "upgrade the legacy parser that rejects h1 attributes",
  );

  old.files.clear();
  await old.ensure(DOUBAN, "Douban.js", REQUIRED_DOUBAN);
  assert.equal(
    old.saved.length,
    2,
    "restore a translator whose cached metadata outlives its file",
  );

  const fallback = harness();
  fallback.sourceUnavailable = true;
  fallback.downloaded = translator(WENJIN, "Wenjin", "2025-09-23 02:30:37");
  await fallback.ensure(WENJIN, "Wenjin.js");
  assert.equal(fallback.downloads.length, 2);
  assert(fallback.downloads[1].startsWith("https://ftp.zotero-chinese.com/"));

  for (const code of [
    "<html>Download error</html>",
    translator(WENJIN, "Wenjin", "2025-09-23 02:30:37"),
    translator(DOUBAN, "Douban", "2024-08-07 08:46:18"),
  ]) {
    const invalid = harness();
    invalid.downloaded = code;
    await assert.rejects(
      invalid.ensure(DOUBAN, "Douban.js", REQUIRED_DOUBAN),
      /book-metadata-translator-unavailable: Douban/,
    );
    assert.equal(
      invalid.saved.length,
      0,
      "invalid downloads must not replace a translator",
    );
    assert.equal(invalid.reinitialized, 0);
  }
  console.log(
    "Missing, outdated and deleted book translators, mirror fallback and invalid download protection passed",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
