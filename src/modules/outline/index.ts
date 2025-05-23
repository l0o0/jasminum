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
import { ICONS } from "./style";

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
    classList: ["j-outline-hidden"], // 默认隐藏
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
    classList: ["viewWrapper", "hidden"], // 默认隐藏
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
    ],
  });

  // 添加工具栏
  doc
    .getElementById("sidebarContainer")!
    .insertBefore(toolbar, doc.getElementById("sidebarContent")!);
  treeContainer.appendChild(dropIndicator);
  createTreeNodes(data, treeContainer.querySelector("#root-list")!, doc);
  doc.querySelector("#sidebarContent")?.appendChild(treeContainer);
  initEventListener(reader, doc);

  return treeContainer;
}

export async function addOutlineToReader(reader: _ZoteroTypes.ReaderInstance) {
  const doc = reader._iframeWindow!.document;
  if (doc.querySelector("#j-outline-button")) {
    ztoolkit.log("Outline is already added, skip.");
    return;
  }
  // 等待元素加载
  // ztoolkit.log(new Date().toISOString());
  await wait.waitUtilAsync(
    () => {
      return doc.querySelector("#sidebarContainer div.start") ? true : false;
    },
    5, // 减少图标出现延迟感
    5000,
  );
  // ztoolkit.log(new Date().toISOString());
  ztoolkit.log("Sidebar container is ready.");
  addButton(doc);
  const joutline = await getOutlineFromPDF(reader);
  if (!joutline) {
    ztoolkit.log("No outline to add.");
  }
  ztoolkit.log("++joutline", joutline);

  registerOutlineCSS(doc);
  registerThemeChange(reader._iframeWindow!);

  renderTree(reader, doc, joutline);
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
