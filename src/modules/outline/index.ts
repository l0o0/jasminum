import { wait } from "zotero-plugin-toolkit";
import { getString } from "../../utils/locale";
import { initEventListener } from "./events";
import {
  addButton,
  createTreeNodes,
  getOutlineFromPDF,
  registerOutlineCSS,
  registerThemeChange,
} from "./outline";
import {
  addBookmarkButton,
  createBookmarkNodes,
  loadBookmarksFromJSON,
} from "./bookmark";
import { ICONS } from "./style";
import { getPref } from "../../utils/prefs";

export function renderTree(
  reader: _ZoteroTypes.ReaderInstance,
  doc: Document,
  data: OutlineNode[] | null,
) {
  const dropIndicator = ztoolkit.UI.createElement(doc, "div", {
    classList: ["drop-indicator"],
  });
  const toolbar = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: "j-outline-toolbar",
    classList: ["j-hidden"], // 默认隐藏
    children: [
      {
        tag: "button",
        id: "j-outline-expand-all",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.expand },
        attributes: { title: getString("outline-expand-all") },
      },
      {
        tag: "button",
        id: "j-outline-collapse-all",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.collapse },
        attributes: { title: getString("outline-collapse-all") },
      },
      {
        tag: "button",
        id: "j-outline-add-node",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.add },
        attributes: { title: getString("outline-add") },
      },
      {
        tag: "button",
        id: "j-outline-delete-node",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.del },
        attributes: { title: getString("outline-delete") },
      },
      {
        tag: "button",
        id: "j-outline-save-pdf",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.save },
        attributes: { title: getString("outline-save-to-pdf") },
      },
    ],
  });
  const treeContainer = ztoolkit.UI.createElement(doc, "div", {
    id: "jasminum-outline",
    classList: ["hidden"], // 默认隐藏
    namespace: "html",
    children: [
      {
        tag: "div",
        namespace: "html",
        id: "j-outline-viewer",
        classList: ["outline-view"],
        attributes: {
          tabindex: "-1",
          "data-tabstop": "1",
          role: "tabpanel",
          "aria-labelledby": "j-outline-button",
        },
        children: [
          {
            tag: "ul",
            namespace: "html",
            id: "root-list",
            classList: ["tree-list"],
          },
        ],
      },
      {
        tag: "div",
        namespace: "html",
        classList: ["jasminum-sidebar-bottom"],
        children: [
          {
            tag: "button",
            namespace: "html",
            id: "j-outline-zoom-in",
            classList: ["j-outline-toolbar-button", "toolbar-button"],
            properties: { innerHTML: ICONS.plus },
            attributes: { title: "字体变大" },
            styles: { paddingBottom: "7px" },
          },
          {
            tag: "button",
            namespace: "html",
            id: "j-outline-zoom-out",
            classList: ["j-outline-toolbar-button", "toolbar-button"],
            properties: { innerHTML: ICONS.minus },
            attributes: { title: "字体变小" },
            styles: { paddingBottom: "7px" },
          },
        ],
      },
    ],
  });
  // 隐藏 Zotero 大纲按钮
  if (getPref("disableZoteroOutline")) {
    doc.getElementById("viewOutline")!.style.display = "none";
  }
  // 添加工具栏
  doc
    .getElementById("sidebarContainer")!
    .insertBefore(toolbar, doc.getElementById("sidebarContent")!);
  treeContainer.appendChild(dropIndicator);
  createTreeNodes(data, treeContainer.querySelector("#root-list")!, doc);
  doc.querySelector("#sidebarContent")?.appendChild(treeContainer);

  return treeContainer;
}

export function renderBookmarkTree(
  reader: _ZoteroTypes.ReaderInstance,
  doc: Document,
  data: BookmarkNode[] | null,
) {
  const dropIndicator = ztoolkit.UI.createElement(doc, "div", {
    classList: ["bookmark-drop-indicator"],
  });
  const toolbar = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: "j-bookmark-toolbar",
    classList: ["j-hidden"], // 默认隐藏
    children: [
      {
        tag: "button",
        id: "j-bookmark-add",
        classList: ["j-bookmark-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.add },
        attributes: { title: getString("bookmark-add") },
      },
      {
        tag: "button",
        id: "j-bookmark-delete",
        classList: ["j-bookmark-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.del },
        attributes: { title: getString("bookmark-delete") },
      },
    ],
  });
  const bookmarkContainer = ztoolkit.UI.createElement(doc, "div", {
    id: "jasminum-bookmarks",
    classList: ["hidden"], // 默认隐藏
    namespace: "html",
    children: [
      {
        tag: "div",
        namespace: "html",
        id: "j-bookmark-viewer",
        classList: ["bookmark-view"],
        attributes: {
          tabindex: "-1",
          "data-tabstop": "1",
          role: "tabpanel",
          "aria-labelledby": "j-bookmark-button",
        },
        children: [
          {
            tag: "ul",
            namespace: "html",
            id: "bookmark-root-list",
            classList: ["bookmark-list"],
          },
        ],
      },
    ],
  });

  // 添加工具栏
  doc
    .getElementById("sidebarContainer")!
    .insertBefore(toolbar, doc.getElementById("sidebarContent")!);
  bookmarkContainer.appendChild(dropIndicator);
  createBookmarkNodes(
    data,
    bookmarkContainer.querySelector("#bookmark-root-list")!,
    doc,
  );
  doc.querySelector("#sidebarContent")?.appendChild(bookmarkContainer);

  return bookmarkContainer;
}

export async function addOutlineToReader(reader: _ZoteroTypes.ReaderInstance) {
  const doc = reader._iframeWindow!.document;
  if (doc.querySelector("#j-outline-button")) {
    ztoolkit.log("Outline is already added, skip.");
    return;
  }
  // 等待元素加载
  await wait.waitUtilAsync(
    () => {
      return doc.querySelector("#sidebarContainer div.start") ? true : false;
    },
    5, // 减少图标出现延迟感
    5000,
  );
  ztoolkit.log("Sidebar container is ready.");
  addButton(doc);
  addBookmarkButton(doc); // 同时添加书签按钮

  const joutline = await getOutlineFromPDF(reader);
  if (!joutline) {
    ztoolkit.log("No outline to add.");
  }
  ztoolkit.log("++joutline", joutline);

  const bookmarks = await loadBookmarksFromJSON(reader._item);
  ztoolkit.log("++bookmarks", bookmarks);

  registerOutlineCSS(doc);
  registerThemeChange(reader._iframeWindow!);

  renderTree(reader, doc, joutline);
  renderBookmarkTree(reader, doc, bookmarks);
  initEventListener(reader, doc);
}

export async function registerOutline(tabID: string) {
  if (!tabID) {
    ztoolkit.log(`Tab ID is not valid. %{tabID}`);
    return;
  }
  await Zotero.Reader.init();
  const reader = Zotero.Reader.getByTabID(tabID as string);
  try {
    await reader._initPromise;
    ztoolkit.log("Init " + reader._isReaderInitialized);
    // Only pdf
    if (reader._item.attachmentContentType != "application/pdf") {
      ztoolkit.log("Only support PDF reader.");
      return;
    }
    // This should add a waiting process.
    // @ts-ignore - not typed
    const doc = reader._iframeWindow?.document;
    // ztoolkit.log("registerOutline", new Date().toISOString());
    await wait.waitUtilAsync(
      () => {
        return doc && doc.getElementById("sidebarToggle") ? true : false;
      },
      5,
      5000,
    );
    // ztoolkit.log("registerOutline", new Date().toISOString());
    ztoolkit.log("Sidebar toggle button is ready.");
    // Sidebar is already opened, add outline.
    if (doc && doc.getElementById("sidebarContainer")) {
      addOutlineToReader(reader);
    }
    // Click toggle button to open sidebar.
    doc
      ?.getElementById("sidebarToggle")
      ?.addEventListener("click", (ev: Event) => {
        ztoolkit.log("outline is added by toggle click");
        addOutlineToReader(reader);
      });
  } catch (e) {
    Zotero.debug(
      "********************* outline add error *********************",
    );
    ztoolkit.log("Error in registerOutline", e);
    ztoolkit.log(`tabID: ${tabID}`);
    ztoolkit.log(`reader: ${reader}`);
  }
}
