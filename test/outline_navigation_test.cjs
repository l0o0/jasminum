const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (n) => mocks[n] },
  );
  return exports;
}
class Element {
  constructor(tag, level) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = { level: String(level) };
    this.classes = new Set();
    this.classList = {
      add: (...xs) => xs.forEach((x) => this.classes.add(x)),
      remove: (...xs) => xs.forEach((x) => this.classes.delete(x)),
    };
  }
  get parentNode() {
    return this.parentElement;
  }
  get nextSibling() {
    return (
      this.parentElement?.children[
        this.parentElement.children.indexOf(this) + 1
      ] ?? null
    );
  }
  get previousElementSibling() {
    return (
      this.parentElement?.children[
        this.parentElement.children.indexOf(this) - 1
      ] ?? null
    );
  }
  append(node) {
    node.remove();
    this.children.push(node);
    node.parentElement = this;
  }
  insertBefore(node, ref) {
    node.remove();
    this.children.splice(
      ref ? this.children.indexOf(ref) : this.children.length,
      0,
      node,
    );
    node.parentElement = this;
  }
  remove() {
    if (this.parentElement) {
      const a = this.parentElement.children;
      a.splice(a.indexOf(this), 1);
      this.parentElement = null;
    }
  }
  closest(tag) {
    return this.tagName === tag.toUpperCase()
      ? this
      : this.parentElement?.closest(tag);
  }
  getAttribute(k) {
    return this.attrs[k];
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  querySelectorAll() {
    return this.children.flatMap((n) => [
      ...(n.tagName === "DIV" ? [n] : []),
      ...n.querySelectorAll(),
    ]);
  }
  querySelector(s) {
    if (s === ":scope > ul" || s === "ul")
      return this.children.find((n) => n.tagName === "UL");
    if (s === ".expander") return { textContent: "", innerHTML: "" };
    return this.querySelectorAll()[0];
  }
  scrollIntoView() {}
}
function entry(level) {
  const li = new Element("li");
  li.append(new Element("div", level));
  return li;
}
async function main() {
  let saves = 0;
  const { changeOutlineLevel } = load("src/modules/outline/events.ts", {
    "./savePDF": {},
    "./outline": {
      saveOutlineToJSON: async (item) => {
        assert.equal(item.id, 1);
        saves++;
      },
      getOutlineFromPage: () => [],
    },
    "./bookmark": {},
    "./style": { ICONS: { down: "down" } },
    "../../utils/locale": {},
    "../../utils/prefs": {},
  });
  const root = new Element("ul");
  root.id = "root-list";
  const first = entry(1),
    moved = entry(1),
    child = entry(2),
    grandchild = entry(3);
  root.append(first);
  root.append(moved);
  const children = new Element("ul"),
    grandchildren = new Element("ul");
  moved.append(children);
  children.append(child);
  child.append(grandchildren);
  grandchildren.append(grandchild);
  let selected = moved.children[0];
  const doc = {
    querySelector: () => selected,
    createElement: (tag) => new Element(tag),
  };
  const reader = { _item: { id: 1 } };
  await changeOutlineLevel(doc, reader, 1);
  assert.equal(moved.parentElement.parentElement, first);
  assert.deepEqual(
    [moved, child, grandchild].map((n) => n.children[0].getAttribute("level")),
    ["2", "3", "4"],
  );
  await changeOutlineLevel(doc, reader, -1);
  assert.equal(moved.parentElement, root);
  assert.deepEqual(
    [moved, child, grandchild].map((n) => n.children[0].getAttribute("level")),
    ["1", "2", "3"],
  );
  assert.equal(first.children.length, 1, "empty child container removed");
  await changeOutlineLevel(doc, reader, -1);
  assert.equal(saves, 2, "root promotion is a no-op");
  grandchild.children[0].setAttribute("level", "7");
  await changeOutlineLevel(doc, reader, 1);
  assert.equal(saves, 2, "whole subtree must respect maximum depth");
  selected = first.children[0];
  await changeOutlineLevel(doc, reader, 1);
  assert.equal(saves, 2, "first sibling cannot be demoted");
  const { outlineIndexForPage, revealOutlineNode } = load("src/modules/outline/follow.ts", {
    "./style": { ICONS: {} },
  });
  assert.equal(outlineIndexForPage([1, 4, 9], 7), 1);
  assert.equal(outlineIndexForPage([9, 1, 4], 7), 2);
  assert.equal(outlineIndexForPage([1, 4, 4, 9], 4), 2);
  assert.equal(outlineIndexForPage([4, 9], 1), -1);
  assert.equal(outlineIndexForPage([NaN, 0, 4], 5), 2);
  const viewport = {
    getBoundingClientRect: () => ({ top: 100 }),
    clientTop: 1,
    clientHeight: 200,
    scrollTop: 80,
  };
  const row = (top, bottom) => ({
    getBoundingClientRect: () => ({ top, bottom }),
  });
  revealOutlineNode(viewport, row(270, 320));
  assert.equal(viewport.scrollTop, 99, "reveal a row below the viewport");
  revealOutlineNode(viewport, row(80, 110));
  assert.equal(viewport.scrollTop, 78, "reveal a row above the viewport");
  revealOutlineNode(viewport, row(130, 160));
  assert.equal(viewport.scrollTop, 78, "visible rows do not move the viewport");
  console.log("Outline subtree level changes and page following passed");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
