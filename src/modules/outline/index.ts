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

export function renderTree(doc: Document, data: OutlineNode[] | null) {
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
        listeners: [
          {
            type: "click",
            listener: (ev: Event) => {
              const doc = (ev.target as Element).ownerDocument;
              doc.defaultView!.alert("保存到PDF文件的功能还在开发中");
            },
          },
        ],
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
  initEventListener(doc);

  return treeContainer;
}

export async function addOutlineToReader(reader: _ZoteroTypes.ReaderInstance) {
  const doc = reader._iframeWindow!.document;
  if (doc.querySelector("#j-outline-button")) {
    ztoolkit.log("Outline is added already.");
    return;
  }
  // 等待元素加载
  let targetButton: HTMLElement | null = null;
  let waiting = 0;
  while (!targetButton && waiting < 5000) {
    // @ts-ignore - Not typed
    await Zotero.Promise.delay(200);
    if (doc) {
      targetButton = doc.querySelector("#sidebarContainer div.start");
      if (targetButton) {
        ztoolkit.log("sidebar tool buttons show");
      }
    }
    ztoolkit.log(`Waiting ${waiting}`);
    waiting += 200;
  }

  addButton(doc);
  const joutline = await getOutlineFromPDF(reader);
  if (!joutline) {
    ztoolkit.log("No outline to add.");
  }
  ztoolkit.log("++joutline", joutline);

  registerOutlineCSS(doc);
  registerThemeChange(reader._iframeWindow!);

  renderTree(doc, joutline);
}

export async function registerOutline(tabID?: string) {
  if (!tabID) {
    ztoolkit.log("Need to add outline to opeened reader.");
    if (ztoolkit.getGlobal("Zotero_Tabs").selectedType != "reader") {
      ztoolkit.log("Zotero opened a non-reader tab in startup.");
      return;
    }
    const tabID = ztoolkit.getGlobal("Zotero_Tabs").selectedID;
    ztoolkit.log("Open tab id is ", tabID);
  }
  await Zotero.Reader.init();
  const reader = Zotero.Reader.getByTabID(tabID as string);
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

  let toggleButton: HTMLElement | null = null;
  let waiting = 0;
  while (!toggleButton && waiting < 5000) {
    // @ts-ignore - Not typed
    await Zotero.Promise.delay(200);
    if (doc) {
      toggleButton = doc.getElementById("sidebarToggle");
      if (toggleButton) {
        ztoolkit.log("Toggle button shows");
      }
    }
    ztoolkit.log(`Waiting ${waiting}`);
    waiting += 200;
  }

  // Reader sidebarContainer is open
  if (doc && doc.getElementById("sidebarContainer")) {
    addOutlineToReader(reader);
  } else if (doc && doc.getElementById("sidebarContainer") === null) {
    doc
      ?.getElementById("sidebarToggle")
      ?.addEventListener("click", (ev: Event) => {
        ztoolkit.log("outline is added by toggle click");
        addOutlineToReader(reader);
      });
  } else {
    ztoolkit.log("Nothing to do with outline");
  }
}
