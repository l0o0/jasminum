"use strict";

const assert = require("node:assert/strict");
const {
  buildNCPSSDArticleURL,
  buildNCPSSDSearchExpression,
  mapNCPSSDSearchResponse,
} = require("../tmp/ncpssd-test/src/modules/services/ncpssdCore");

assert.equal(
  buildNCPSSDSearchExpression("  数字   治理  "),
  '(IKTE="数字 治理" OR IKPYTE="数字 治理" OR IKET="数字 治理") AND TYPE="中文期刊文章"',
);
assert.ok(buildNCPSSDSearchExpression('题名"测试').includes('题名\\"测试'));
assert.ok(buildNCPSSDSearchExpression("题名\\测试").includes("题名\\\\测试"));
assert.equal(buildNCPSSDSearchExpression("   "), null);

assert.equal(
  buildNCPSSDArticleURL("TJYXXLT2026006001"),
  "https://www.ncpssd.cn/Literature/articleinfo?id=TJYXXLT2026006001&type=journalArticle&typename=%E4%B8%AD%E6%96%87%E6%9C%9F%E5%88%8A%E6%96%87%E7%AB%A0&nav=0&barcodenum=",
);

const response = {
  result: true,
  code: 200,
  data: {
    rows: [
      {
        type: "中文期刊文章",
        data_id: "TJYXXLT2026006001",
        title: "针对信息冗余和伪区间问题的区间时间序列预测研究",
        ik_title: "<font color='red'>针对信息冗余</font>",
        creator: "汪漂[1];陶志富[2];刘金培[2]",
        cbw_name: "统计与信息论坛",
        date: "2026-06-10T00:00:00.000+0000",
        years: "2026",
        vol: "041",
        num: "6",
        beginpage: "1",
        endpage: "16",
        issn: "1007-3116",
        doi: "10.20207/j.cnki.1007-3116.20260419.001",
      },
      {
        type: "中文期刊文章",
        data_id: "TJYXXLT2026006001",
        title: "重复记录",
      },
      {
        type: "外文期刊文章",
        data_id: "FOREIGN1",
        title: "Foreign record",
      },
      { type: "中文期刊文章", title: "缺少 ID" },
      { type: "中文期刊文章", data_id: "NO_TITLE" },
    ],
  },
};

const results = mapNCPSSDSearchResponse(response);
assert.equal(results.length, 1);
assert.equal(
  results[0].articleTitle,
  "针对信息冗余和伪区间问题的区间时间序列预测研究",
);
assert.equal(results[0].articleID, "TJYXXLT2026006001");
assert.equal(results[0].source, "NCPSSD");
assert.equal(results[0].pages, "1-16");
assert.equal(results[0].doi, "10.20207/j.cnki.1007-3116.20260419.001");
assert.ok(!results[0].articleTitle.includes("<font"));
assert.ok(results[0].title.includes("统计与信息论坛"));

assert.deepEqual(mapNCPSSDSearchResponse(null), []);
assert.deepEqual(mapNCPSSDSearchResponse({ result: false, code: 500 }), []);
assert.deepEqual(
  mapNCPSSDSearchResponse({ result: true, code: 200, data: {} }),
  [],
);

console.log("NCPSSD core test passed");
