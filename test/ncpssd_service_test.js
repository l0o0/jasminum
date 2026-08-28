"use strict";

const assert = require("node:assert/strict");

global.ChromeUtils = { importESModule: () => ({ HiddenBrowser: class {} }) };
global.ztoolkit = { log() {} };

const {
  NCPSSD,
  NCPSSD_TRANSLATOR_ID,
} = require("../tmp/ncpssd-test/src/modules/services/ncpssd");

function articleRow() {
  return {
    type: "中文期刊文章",
    data_id: "TJYXXLT2026006001",
    title: "针对信息冗余和伪区间问题的区间时间序列预测研究",
    creator: "汪漂[1];陶志富[2];刘金培[2]",
    cbw_name: "统计与信息论坛",
    years: "2026",
    doi: "10.20207/j.cnki.1007-3116.20260419.001",
  };
}

function baseDependencies(overrides = {}) {
  return {
    async requestSearch() {
      return JSON.stringify({ result: true, code: 200, data: { rows: [] } });
    },
    async loadDocument() {
      return { location: { href: "https://www.ncpssd.cn/" } };
    },
    createTranslator() {
      throw new Error("translator not configured");
    },
    ...overrides,
  };
}

async function main() {
  let requestBody = "";
  const searchService = new NCPSSD(
    baseDependencies({
      async requestSearch(body) {
        requestBody = body;
        return JSON.stringify({
          result: true,
          code: 200,
          data: { rows: [articleRow()] },
        });
      },
    }),
  );
  const searchResults = await searchService.search({ title: "  区间   预测 " });
  assert.equal(searchResults.length, 1);
  const form = new URLSearchParams(requestBody);
  assert.equal(form.get("pageNum"), "1");
  assert.equal(form.get("pageSize"), "20");
  assert.equal(form.get("sType"), "0");
  assert.ok(form.get("search").includes('TYPE="中文期刊文章"'));
  assert.equal(await searchService.search({ title: "   " }), null);

  const document = { location: { href: searchResults[0].url } };
  const translatedItem = {
    fields: { DOI: "" },
    getField(name) {
      return this.fields[name] || "";
    },
    setField(name, value) {
      this.fields[name] = value;
    },
  };
  const calls = {};
  const translator = {
    setTranslator(id) {
      calls.translatorID = id;
    },
    setDocument(value) {
      calls.document = value;
    },
    async translate(options) {
      calls.options = options;
      return [translatedItem];
    },
  };
  const translateService = new NCPSSD(
    baseDependencies({
      async loadDocument(url) {
        calls.url = url;
        return document;
      },
      createTranslator() {
        return translator;
      },
    }),
  );
  const translated = await translateService.translate(
    searchResults[0],
    12,
    false,
  );
  assert.equal(translated.status, "success");
  assert.equal(calls.translatorID, NCPSSD_TRANSLATOR_ID);
  assert.equal(calls.document, document);
  assert.deepEqual(calls.options, { libraryID: 12, saveAttachments: false });
  assert.equal(calls.url, searchResults[0].url);
  assert.equal(translatedItem.fields.DOI, articleRow().doi);

  translatedItem.fields.DOI = "10.1000/translator-doi";
  await translateService.translate(searchResults[0], 12, false);
  assert.equal(translatedItem.fields.DOI, "10.1000/translator-doi");

  const emptyService = new NCPSSD(
    baseDependencies({
      createTranslator() {
        return {
          setTranslator() {},
          setDocument() {},
          async translate() {
            return [];
          },
        };
      },
    }),
  );
  assert.deepEqual(await emptyService.translate(searchResults[0], 1, false), {
    status: "empty",
    items: [],
  });

  const errorService = new NCPSSD(
    baseDependencies({
      async loadDocument() {
        throw new Error("page unavailable");
      },
    }),
  );
  const failed = await errorService.translate(searchResults[0], 1, false);
  assert.equal(failed.status, "error");
  assert.ok(failed.error.includes("NCPSSD translation failed"));
  console.log("NCPSSD service test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
