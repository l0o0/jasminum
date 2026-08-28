"use strict";

const assert = require("node:assert/strict");

const {
  runSequentialSearchChain,
} = require("../tmp/ncpssd-test/src/modules/services/searchChain");

function result(articleTitle) {
  return { articleTitle, similarity: 0 };
}

function stage(name, calls, results, enabled = true) {
  return {
    name,
    enabled,
    async search() {
      calls.push(name);
      return results;
    },
  };
}

async function run(stages, events = []) {
  return runSequentialSearchChain(stages, "exact title", {
    scoreResults(results, searchTitle) {
      events.push(`score:${results.length}`);
      for (const searchResult of results) {
        searchResult.similarity =
          searchResult.articleTitle === searchTitle ? 1 : 0.5;
      }
    },
    hasExactMatch(results) {
      events.push(`exact:${results.map((item) => item.similarity).join(",")}`);
      return results.some((item) => item.similarity === 1);
    },
    onResult(name, results) {
      events.push(`result:${name}:${results.length}`);
    },
    onError(name, error) {
      events.push(`error:${name}:${error.message}`);
    },
  });
}

async function main() {
  {
    const calls = [];
    const stages = [
      stage("PubScholar", calls, [result("near title")]),
      stage("NCPSSD", calls, [result("exact title")]),
      stage("Yiigle", calls, [result("exact title")]),
      stage("CNKI", calls, [result("exact title")]),
    ];
    const results = await run(stages);
    assert.deepEqual(calls, ["PubScholar", "NCPSSD"]);
    assert.equal(results.length, 2);
  }

  {
    const calls = [];
    await run([
      stage("PubScholar", calls, [result("exact title")]),
      stage("NCPSSD", calls, [result("near title")]),
      stage("Yiigle", calls, [result("near title")]),
      stage("CNKI", calls, [result("near title")]),
    ]);
    assert.deepEqual(calls, ["PubScholar"]);
  }

  {
    const calls = [];
    await run([
      stage("PubScholar", calls, [result("one")]),
      stage("NCPSSD", calls, [result("two")]),
      stage("Yiigle", calls, [result("three")]),
      stage("CNKI", calls, [result("four")]),
    ]);
    assert.deepEqual(calls, ["PubScholar", "NCPSSD", "Yiigle", "CNKI"]);
  }

  {
    const calls = [];
    const events = [];
    await run(
      [
        {
          name: "PubScholar",
          enabled: true,
          async search() {
            calls.push("PubScholar");
            throw new Error("unavailable");
          },
        },
        stage("NCPSSD", calls, [result("near title")]),
        stage("Yiigle", calls, [result("disabled")], false),
        stage("CNKI", calls, [], true),
      ],
      events,
    );
    assert.deepEqual(calls, ["PubScholar", "NCPSSD", "CNKI"]);
    assert.ok(events.includes("error:PubScholar:unavailable"));
    assert.ok(events.includes("result:CNKI:0"));
  }

  {
    const calls = [];
    const events = [];
    await run([stage("PubScholar", calls, [result("exact title")])], events);
    assert.deepEqual(events.slice(0, 3), [
      "score:1",
      "result:PubScholar:1",
      "exact:1",
    ]);
  }

  console.log("Sequential search chain test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
