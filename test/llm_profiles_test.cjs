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
    { exports, require: (n) => mocks[n], ...globals },
  );
  return exports;
}
const prefs = {
  llmBaseURL: "https://old.example/v1",
  llmApiKey: "original-key",
  llmModel: "original-model",
  llmProfiles: "",
};
const prefMock = {
  getPref: (k) => prefs[k],
  setPref: (k, v) => (prefs[k] = v),
};
const store = load("src/modules/preferences/llmProfiles.ts", {
  "../../utils/prefs": prefMock,
});
class Node {
  constructor() {
    this.value = "";
    this.children = [];
    this.events = {};
  }
  addEventListener(name, fn) {
    (this.events[name] ??= []).push(fn);
  }
  dispatchEvent(e) {
    for (const f of this.events[e.type] ?? []) f(e);
  }
  append(n) {
    this.children.push(n);
  }
  replaceChildren() {
    this.children = [];
  }
  setAttribute() {}
  removeAttribute() {}
}
function document() {
  const nodes = new Map();
  return {
    defaultView: { Event },
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, new Node());
      return nodes.get(id);
    },
    createElementNS() {
      return new Node();
    },
  };
}
let serial = 0;
const ui = load(
  "src/modules/preferences/llmProviders.ts",
  {
    "./llmProfiles": store,
    "../../utils/locale": { getLocaleID: (s) => s, getString: (s) => s },
  },
  { Zotero: { Utilities: { randomString: () => String(++serial) } } },
);
const doc = document();
ui.bindLLMProviderEvents(doc);
const node = (suffix) => doc.getElementById("jasminum-llm-" + suffix);
const change = (suffix, value, type = "change") => {
  node(suffix).value = value;
  node(suffix).dispatchEvent(new Event(type));
};
assert.equal(prefs.llmApiKey, "original-key");
change("provider", "deepseek");
assert.equal(prefs.llmApiKey, "");
change("api-key", "deepseek-key", "input");
change("model", "custom-model", "input");
change("provider", "magiczotero");
assert.equal(prefs.llmApiKey, "");
change("api-key", "magic-key", "input");
change("provider", "deepseek");
assert.equal(prefs.llmApiKey, "deepseek-key");
assert.equal(prefs.llmModel, "custom-model");
change("profile", "default");
assert.equal(prefs.llmBaseURL, "https://old.example/v1");
assert.equal(prefs.llmApiKey, "original-key");
node("profile-add").dispatchEvent(new Event("click"));
change("base-url", "https://second.example/v1", "input");
change("api-key", "second-key", "input");
const restoredDoc = document();
ui.bindLLMProviderEvents(restoredDoc);
assert.equal(
  restoredDoc.getElementById("jasminum-llm-api-key").value,
  "second-key",
);
assert.equal(JSON.parse(prefs.llmProfiles).profiles.length, 4);
node("profile-delete").dispatchEvent(new Event("click"));
assert.equal(JSON.parse(prefs.llmProfiles).profiles.length, 3);
assert(!prefs.llmProfiles.includes("second-key"));
console.log(
  "AI profile migration, provider round trips, independent custom profiles and reload passed",
);
