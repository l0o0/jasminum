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
assert.deepEqual(updateMetadataSources(["CNKI"], "WanFangData", true), [
  "CNKI",
]);
assert.deepEqual(
  updateMetadataSources(["Yiigle", "WanFangData", "CNKI"], "AI", true),
  ["Yiigle", "CNKI", "AI"],
);
assert.throws(
  () => updateMetadataSources(["CNKI", "WanFangData"], "CNKI", false),
  MetadataSourceSelectionError,
);

console.log("metadata source test passed");
