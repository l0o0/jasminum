"use strict";

const assert = require("node:assert/strict");
const {
  MetadataSourceSelectionError,
  updateMetadataSources,
} = require("../tmp/metadataSource");

assert.throws(
  () => updateMetadataSources(["CNKI"], "CNKI", false),
  MetadataSourceSelectionError,
);
assert.deepEqual(updateMetadataSources(["CNKI", "Yiigle"], "CNKI", false), [
  "Yiigle",
]);
assert.deepEqual(updateMetadataSources(["CNKI"], "Yiigle", true), [
  "CNKI",
  "Yiigle",
]);

console.log("metadata source test passed");
