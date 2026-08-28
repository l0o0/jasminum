"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const services = read("src/modules/services/index.ts");
assert.match(services, /import \{ NCPSSD \} from "\.\/ncpssd";/);
assert.match(services, /const ncpssd = new NCPSSD\(\);/);
assert.match(services, /metadataSources\.includes\("NCPSSD"\)/);
assert.match(services, /case "NCPSSD":/);
assert.match(services, /runSequentialSearchChain\(/);

const pubScholarIndex = services.indexOf(
  'metadataSources.includes("PubScholar")',
);
const ncpssdIndex = services.indexOf('metadataSources.includes("NCPSSD")');
const yiigleIndex = services.indexOf('metadataSources.includes("Yiigle")');
const cnkiIndex = services.indexOf('metadataSources.includes("CNKI")');
assert.ok(pubScholarIndex >= 0 && pubScholarIndex < ncpssdIndex);
assert.ok(ncpssdIndex < yiigleIndex);
assert.ok(yiigleIndex < cnkiIndex);
assert.match(
  services,
  /Exact match found in PubScholar, skipping later services/,
);

const prefs = read("addon/prefs.js");
assert.match(
  prefs,
  /pref\(\s*"metadataSource",\s*"PubScholar, NCPSSD, CNKI, WanFangData, Yiigle",?\s*\);/,
);

const preferencePane = read("addon/chrome/content/preferences-main.xhtml");
assert.match(preferencePane, /value="NCPSSD"/);
assert.match(preferencePane, /data-l10n-id="label-metadata-source-ncpssd"/);

for (const locale of ["en-US", "zh-CN", "zh-TW"]) {
  const messages = read(`addon/locale/${locale}/preferences-main.ftl`);
  assert.match(messages, /^label-metadata-source-ncpssd =$/m);
}

const i10nTypes = read("typings/i10n.d.ts");
assert.match(i10nTypes, /\| 'label-metadata-source-ncpssd'/);

console.log("NCPSSD wiring test passed");
