import { version } from "../../../package.json";
import { getString } from "../../utils/locale";

export const OUTLINE_SCHEMA = 1;
const MAX_LEVEL = 7;
export const ICONS = {
  outline: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 7.8q-.3-.375-.775-.587T10.2 7q-.9 0-1.55.65T8 9.2q0 .475.137.875t.563.95q.35.45.975 1.075t1.6 1.525q.15.15.337.225t.388.075t.387-.075t.338-.225q.95-.875 1.575-1.487t.975-1.088q.425-.55.575-.963T16 9.2q0-.9-.65-1.55T13.8 7q-.525 0-1.013.212T12 7.8M12 18l-4.2 1.8q-1 .425-1.9-.162T5 17.975V5q0-.825.588-1.412T7 3h10q.825 0 1.413.588T19 5v12.975q0 1.075-.9 1.663t-1.9.162zm0-2.2l5 2.15V5H7v12.95zM12 5H7h10z"/></svg>`,
  expand: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12.675L9.625 10.3q-.275-.275-.687-.275t-.713.275q-.3.3-.3.713t.3.712L11.3 14.8q.3.3.7.3t.7-.3l3.1-3.1q.3-.3.287-.7t-.312-.7q-.3-.275-.7-.288t-.7.288zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/></svg>`,
  collapse: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.675 12L10.3 14.375q-.275.275-.275.688t.275.712q.3.3.713.3t.712-.3L14.8 12.7q.3-.3.3-.7t-.3-.7l-3.1-3.1q-.3-.3-.7-.287t-.7.312q-.275.3-.288.7t.288.7zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/></svg>`,
  add: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m12 18l-4.2 1.8q-1 .425-1.9-.162T5 17.975V5q0-.825.588-1.412T7 3h5q.425 0 .713.288T13 4t-.288.713T12 5H7v12.95l5-2.15l5 2.15V12q0-.425.288-.712T18 11t.713.288T19 12v5.975q0 1.075-.9 1.663t-1.9.162zm0-13H7h6zm5 2h-1q-.425 0-.712-.288T15 6t.288-.712T16 5h1V4q0-.425.288-.712T18 3t.713.288T19 4v1h1q.425 0 .713.288T21 6t-.288.713T20 7h-1v1q0 .425-.288.713T18 9t-.712-.288T17 8z"/></svg>`,
  del: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16 7q-.425 0-.712-.288T15 6t.288-.712T16 5h4q.425 0 .713.288T21 6t-.288.713T20 7zm-4 11l-4.2 1.8q-1 .425-1.9-.162T5 17.975V5q0-.825.588-1.412T7 3h5q.425 0 .713.288T13 4t-.288.713T12 5H7v12.95l5-2.15l5 2.15V12q0-.425.288-.712T18 11t.713.288T19 12v5.975q0 1.075-.9 1.663t-1.9.162zm0-13H7h6z"/></svg>`,
  save: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h11.175q.4 0 .763.15t.637.425l2.85 2.85q.275.275.425.638t.15.762V19q0 .825-.587 1.413T19 21zM19 7.85L16.15 5H5v14h14zM12 18q1.25 0 2.125-.875T15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18m-5-8h7q.425 0 .713-.288T15 9V7q0-.425-.288-.712T14 6H7q-.425 0-.712.288T6 7v2q0 .425.288.713T7 10M5 7.85V19V5z"/></svg>`,
};

// Register custom CSS for Jasminum outline
export function registerOutlineCSS(doc: Document) {
  ztoolkit.log("** Register css");
  ztoolkit.UI.appendElement(
    {
      tag: "style",
      namespace: "html",
      attributes: { type: "text/css" },
      properties: {
        textContent: outline_css,
      },
    },
    doc.querySelector("head")!,
  );
}

// Register for theme update
export function registerThemeChange(win: Window) {
  win
    ?.matchMedia("(prefers-color-scheme: dark)")!
    .addEventListener("change", (e: MediaQueryListEvent) => {
      if (e.matches) {
        win.document.documentElement.setAttribute("data-theme", "dark");
      } else {
        win.document.documentElement.setAttribute("data-theme", "light");
      }
    });

  // Init theme for outline tree.
  // 窗口启动时为黑暗主题，将书签主题设置为黑暗模式
  if (win.matchMedia("(prefers-color-scheme: dark)")!.matches === true) {
    win.document.documentElement.setAttribute("data-theme", "dark");
  }
}

// Add outline button and outline tree.
function addButton(doc: Document) {
  if (doc.querySelector("#sidebarContainer div.start") === null) {
    ztoolkit.log("Button toolbar is missing.");
  }
  ztoolkit.UI.appendElement(
    {
      tag: "button",
      namespace: "html",
      id: "j-outline-button",
      classList: ["toolbar-button"],
      properties: { innerHTML: ICONS.outline },
      attributes: {
        title: getString("outline"),
        tabindex: "-1",
        role: "tab",
        "aria-selected": "false",
        "aria-controls": "j-outline-viewer",
      },
      listeners: [
        {
          type: "click",
          listener: (e) => {
            ztoolkit.log("Button.click");
            ztoolkit.log(e);
            const d = (e.target! as HTMLButtonElement).ownerDocument;
            const viewer = d.getElementById("j-outline-viewer")?.parentElement;
            // 显示工具栏
            d
              .getElementById("j-outline-toolbar")
              ?.classList.toggle("j-outline-hidden", false);
            if (!viewer?.classList.contains("hidden")) {
              ztoolkit.log("Already display");
            } else {
              // 按钮的激活状态
              d
                .getElementById("viewThumbnail")
                ?.classList.toggle("active", false);
              d
                .getElementById("viewOutline")
                ?.classList.toggle("active", false);
              d
                .getElementById("viewAnnotations")
                ?.classList.toggle("active", false);
              d
                .getElementById("j-outline-button")
                ?.classList.toggle("active", true);
              // 书签内容显示
              d
                .getElementById("thumbnailsView")
                ?.parentElement?.classList.toggle("hidden", true);
              d
                .getElementById("annotationsView")
                ?.classList.toggle("hidden", true);
              d
                .getElementById("outlineView")
                ?.parentElement?.classList.toggle("hidden", true);
              viewer?.classList.toggle("hidden", false);
              (e.target as Element).classList.toggle("active", true);

              ztoolkit.log("Display jasminum outline.");
            }
          },
        },
      ],
    },
    doc.querySelector("#sidebarContainer div.start")!,
  );
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

  fixDisplayClick(doc);
  const newPanel = renderTree(doc, joutline);
  // Click item to jump to page
  newPanel.addEventListener("click", (e: Event) => {
    ztoolkit.log("click to page");
    const topli = (e.target as Element).closest("li.tree-item");
    const treeNode = topli?.querySelector("div.tree-node");
    if (!treeNode) return;

    const page = parseInt(treeNode.getAttribute("page")!);
    const x = parseInt(treeNode.getAttribute("x")!);
    const y = parseInt(treeNode.getAttribute("y")!);
    ztoolkit.log("Click to position", page, x, y);
    // const location = {
    //   position: { pageIndex: page - 1, rects: [[x, y, x, y]] },
    // };
    // @ts-ignore - not typed
    // reader.navigate(location);
    const PDFViewerApplication = (
      reader._internalReader._primaryView as _ZoteroTypes.Reader.PDFView
    )._iframeWindow.PDFViewerApplication;
    const pageView = PDFViewerApplication.pdfViewer.getPageView(page - 1);
    // @ts-ignore - Not typed
    const [scrollX, scrollY] = pageView.viewport.convertToViewportPoint(x, y);
    (
      reader._internalReader._primaryView as _ZoteroTypes.Reader.PDFView
    )._iframeWindow!.PDFViewerApplication.page = page;
    const container = (
      reader._internalReader._primaryView as _ZoteroTypes.Reader.PDFView
    )._iframeWindow!.document.getElementById("viewerContainer")!;
    ztoolkit.log(`Scroll to ${scrollX}, ${scrollY}`);
    container.scrollBy(scrollX, scrollY);
  });
}

// Zotero outline and annations list can not work as expected.
export function fixDisplayClick(doc: Document) {
  // 原始书签和笔记列表点击时会不显示书签内容，这里修复
  doc.querySelector("#viewOutline")?.addEventListener("click", (e) => {
    doc
      .querySelector("#outlineView")
      ?.parentElement?.classList.toggle("hidden", false);
  });
  doc.querySelector("#viewAnnotations")?.addEventListener("click", (e) => {
    doc.querySelector("#annotationsView")?.classList.toggle("hidden", false);
  });
}

// 有 JSON 文件优先读取JSON文件
// 然后再获取PDF自带书签
export async function getOutlineFromPDF(
  reader: _ZoteroTypes.ReaderInstance,
): Promise<OutlineNode[] | null> {
  const item = reader._item;
  const attachmentPath = (await item.getFilePathAsync()) as string;
  const attachmentFolder = PathUtils.parent(attachmentPath);
  const outlinePath = PathUtils.join(
    attachmentFolder!,
    "jasminum-outline.json",
  );
  // 优先从JSON缓存中读取书签信息
  if (await IOUtils.exists(outlinePath)) {
    const outlineJson = await loadOutlineFromJSON(outlinePath);
    if (outlineJson) return outlineJson;
  }
  // 如果上面没有返回Outline信息，重新读取
  const pdfDocument =
    // @ts-ignore - Not typed.
    reader._primaryView._iframeWindow.PDFViewerApplication.pdfDocument;
  const originOutline: PdfOutlineNode[] = await pdfDocument.getOutline2();

  if (originOutline.length == 0) return null;
  ztoolkit.log(originOutline);
  async function convert(
    node: PdfOutlineNode,
    level = 0,
  ): Promise<OutlineNode> {
    level += 1;
    const title = node.title;
    // Default position
    const outlineNode: OutlineNode = {
      level,
      title,
      page: 1,
      x: 100,
      y: 100,
      children: [],
    };
    // Some pdf missing dest, position instead.
    if (node.location && "dest" in node.location) {
      const page = await pdfDocument.getPageIndex(node.location.dest);
      outlineNode.page = page;
    } else if (node.location && "position" in node.location) {
      outlineNode.page = node.location.position.pageIndex + 1;
      outlineNode.x = node.location.position.rects[0][0];
      outlineNode.y = node.location.position.rects[0][1];
    }

    if (node.items.length > 0) {
      outlineNode.children = await Promise.all(
        node.items.map((n) => convert(n, level)),
      );
    }
    return outlineNode;
  }
  const outline = await Promise.all(
    originOutline.map((node) => convert(node, 0)),
  );
  await saveOutlineToJSON(item, outline);
  return outline;
}

export function getOutlineFromPage(): OutlineNode[] {
  function loop(ul: Element): OutlineNode[] {
    const lis = Array.from(
      ul.querySelectorAll(":scope > li.tree-item"),
    )! as Element[];
    return lis.map((li) => {
      const titleSpan = li.querySelector("span.node-title")!;
      const nodeDiv = li.querySelector("div.tree-node")!;
      return {
        level: parseInt(nodeDiv.getAttribute("level")!),
        title: titleSpan.textContent!,
        page: parseInt(nodeDiv.getAttribute("page")!),
        x: parseFloat(nodeDiv.getAttribute("x")!),
        y: parseFloat(nodeDiv.getAttribute("y")!),
        children: li.classList.contains("has-children")
          ? loop(li.querySelector("ul")!)
          : [],
        collapsed: li.classList.contains("collapsed"),
      };
    });
  }
  const reader = Zotero.Reader.getByTabID(
    ztoolkit.getGlobal("Zotero_Tabs").selectedID,
  );
  const rootUL = reader._iframeWindow!.document.querySelector("#root-list ");
  if (!rootUL) return [];
  return loop(rootUL);
}

// 注意SCHEMA
// 注意打开PDF时，默认打开书签
export async function saveOutlineToJSON(
  item?: Zotero.Item,
  outline?: OutlineNode[],
) {
  if (!outline) {
    outline = getOutlineFromPage();
  }
  if (!item) {
    const reader = Zotero.Reader.getByTabID(
      ztoolkit.getGlobal("Zotero_Tabs").selectedID,
    );
    item = reader._item;
  }
  const outlineInfo: OutlineInfo = {
    info: {
      itemID: item.id,
      schema: OUTLINE_SCHEMA,
      jasminumVersion: version,
    },
    outline: outline,
  };
  const outlineStr = JSON.stringify(outlineInfo);
  const attachmentPath = await item.getFilePathAsync();
  if (attachmentPath == false) return;
  const attachmentFolder = PathUtils.parent(attachmentPath);
  await Zotero.File.putContentsAsync(
    PathUtils.join(attachmentFolder!, "jasminum-outline.json"),
    outlineStr,
  );
}

// 加载时要考虑JSON文件的版本信息，如果版本低，要重新从原文件加载信息
export async function loadOutlineFromJSON(
  parm: Zotero.Item | string,
): Promise<OutlineNode[] | null> {
  let outlinePath = "";
  if (typeof parm == "string") {
    outlinePath = parm;
  } else {
    const attachmentPath = await parm.getFilePathAsync();
    if (attachmentPath == false) return null;
    const attachmentFolder = PathUtils.parent(attachmentPath);
    outlinePath = PathUtils.join(attachmentFolder!, "jasminum-outline.json");
  }
  const content = (await Zotero.File.getContentsAsync(outlinePath)) as string;
  const tmp = JSON.parse(content);
  if (tmp.info.schema < OUTLINE_SCHEMA) {
    return null;
  } else {
    return JSON.parse(content)["outline"];
  }
}

function getReaderPagePosition(): PdfPosition {
  const reader = Zotero.Reader.getByTabID(
    ztoolkit.getGlobal("Zotero_Tabs").selectedID,
  );
  const primaryView = reader._internalReader
    ._primaryView as _ZoteroTypes.Reader.PDFView;
  const PDFViewerApplication = primaryView._iframeWindow!.PDFViewerApplication;
  const doc = primaryView._iframeWindow!.document;
  const container = doc.getElementById("viewerContainer")!;
  const pageIndex = PDFViewerApplication.pdfViewer.currentPageNumber - 1;
  const pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);
  const viewport = pageView.viewport;
  // const scrollX = container.scrollLeft - pageView.div.offsetLeft;
  const scrollX = 0;
  const scrollY = container.scrollTop - pageView.div.offsetTop;
  const [x, y] = viewport.convertToPdfPoint(scrollX, scrollY);
  ztoolkit.log(
    "get position",
    pageIndex + 1,
    container.scrollTop,
    scrollX,
    scrollY,
    x,
    y,
  );
  return { position: { pageIndex, rects: [[x, y, x, y]] } };
}

function createTreeNodes(
  nodes: OutlineNode[] | null,
  parentElement: HTMLElement,
  doc: Document,
) {
  if (nodes === null) {
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        namespace: "html",
        classList: ["empty-outline-prompt"],
        properties: { innerHTML: `请点击上方按钮${ICONS.add}创建书签` },
      },
      parentElement,
    );
  } else {
    nodes.forEach((node) => {
      const li = ztoolkit.UI.createElement(doc, "li", {
        namespace: "html",
        classList:
          node.children && node.children.length > 0
            ? ["tree-item", "has-children"]
            : ["tree-item"],
        children: [
          {
            tag: "div",
            namespace: "html",
            classList: ["tree-node", `level-${node.level}`],
            attributes: {
              draggable: "true",
              level: node.level,
              x: node.x,
              y: node.y,
              page: node.page,
            },
            children: [
              {
                tag: "span",
                namespace: "html",
                classList: ["expander"],
                properties: {
                  textContent:
                    node.children && node.children.length > 0 ? "▼" : " ",
                },
              },
              {
                tag: "div",
                namespace: "html",
                classList: ["node-content"],
                children: [
                  {
                    tag: "span",
                    namespace: "html",
                    classList: ["node-title"],
                    properties: { textContent: node.title },
                    attributes: {
                      title: `${node.title}, Page: ${node.page}`,
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      // Collapsed node
      if (node.collapsed) {
        li.classList.add("collapsed");
      }

      // Add children node
      if (node.children && node.children.length > 0) {
        const ul = ztoolkit.UI.createElement(doc, "ul", {
          namespace: "html",
          classList: ["tree-list"],
        });
        createTreeNodes(node.children, ul, doc);
        li.appendChild(ul);
      }
      // Now append the node to the parentElement.
      parentElement.appendChild(li);
      return li;
    });
  }
}

function initEventListener(doc: Document) {
  const treeContainer = doc.getElementById("j-outline-viewer");
  if (!treeContainer) return;
  treeContainer // 节点点击选择事件
    .addEventListener("click", function (e: Event) {
      const target = e.target as HTMLElement;
      ztoolkit.log("click container");
      // 检查是否点击的是展开/折叠图标
      if (
        target.classList.contains("expander") &&
        target.innerText.trim() !== ""
      ) {
        ztoolkit.log("click expander");
        const listItem = target.closest("li");
        if (!listItem) return;
        toggleNode(listItem);
        e.stopPropagation();
        return;
      }

      // 节点选择
      if (target.closest(".tree-node")) {
        selectNode(target.closest(".tree-node")!);
      }
    });

  // 双击编辑节点
  treeContainer.addEventListener("dblclick", function (e) {
    if ((e.target as Element).classList.contains("node-title")) {
      makeNodeEditable(e.target as Element);
    }
  });

  // 拖拽相关事件
  treeContainer.addEventListener("dragstart", handleDragStart);
  treeContainer.addEventListener("dragover", handleDragOver);
  treeContainer.addEventListener("dragleave", handleDragLeave);
  treeContainer.addEventListener("drop", handleDrop);
  treeContainer.addEventListener("dragend", handleDragEnd);
}

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
        listeners: [
          {
            type: "click",
            listener: (ev: Event) => {
              const doc = (ev.target as Element).ownerDocument;
              expandAll(doc);
            },
          },
        ],
      },
      {
        tag: "button",
        id: "j-outline-collapse-all",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.collapse },
        attributes: { title: getString("outline-collapse-all") },
        listeners: [
          {
            type: "click",
            listener: (ev: Event) => {
              const doc = (ev.target as Element).ownerDocument;
              collapseAll(doc);
            },
          },
        ],
      },
      {
        tag: "button",
        id: "j-outline-add-node",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.add },
        attributes: { title: getString("outline-add") },
        listeners: [
          {
            type: "click",
            listener: (ev: Event) => {
              const doc = (ev.target as Element).ownerDocument;
              addNewNode(doc);
            },
          },
        ],
      },
      {
        tag: "button",
        id: "j-outline-remove-node",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.del },
        attributes: { title: getString("outline-delete") },
        listeners: [
          {
            type: "click",
            listener: (ev: Event) => {
              const doc = (ev.target as Element).ownerDocument;
              deleteSelectedNode(doc);
            },
          },
        ],
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

  // Hide or show side bar
  const hiddenMyOutlineAndBar = (e: Event) => {
    ztoolkit.log(e.target as HTMLButtonElement, "clicke to hide outline");
    doc
      .getElementById("j-outline-viewer")
      ?.parentElement?.classList.toggle("hidden", true);
    doc
      .getElementById("j-outline-toolbar")
      ?.classList.toggle("j-outline-hidden", true);
    doc.getElementById("j-outline-button")?.classList.toggle("active", false);
  };

  doc
    .getElementById("viewThumbnail")
    ?.addEventListener("click", hiddenMyOutlineAndBar);
  doc
    .getElementById("viewAnnotations")
    ?.addEventListener("click", hiddenMyOutlineAndBar);
  doc
    .getElementById("viewOutline")
    ?.addEventListener("click", hiddenMyOutlineAndBar);

  return treeContainer;
}

// 为节点添加事件监听，以下为事件处理函数

function expandAll(doc: Document) {
  const collapsedNodes = doc.querySelectorAll(".tree-item.collapsed");
  collapsedNodes.forEach((node) => {
    node.classList.remove("collapsed");

    const expander = node.querySelector(".expander");
    if (expander?.textContent != "") {
      expander!.textContent = "▼";
    }
  });
}

function collapseAll(doc: Document) {
  const parentNodes = doc.querySelectorAll(".tree-item.has-children");
  parentNodes.forEach((node) => {
    node.classList.add("collapsed");
    const expander = node.querySelector(".expander");
    if (expander?.textContent != "") {
      expander!.textContent = "►";
    }
  });
}

// 切换节点展开/折叠状态
function toggleNode(node: Element) {
  if (node.classList.contains("has-children")) {
    node.classList.toggle("collapsed");

    // 更新展开/折叠图标
    const expander = node.querySelector(".expander");
    if (node.classList.contains("collapsed")) {
      expander!.textContent = "►";
    } else {
      expander!.textContent = "▼";
    }
  }
}

// 选择节点
function selectNode(node: Element) {
  const doc = node.ownerDocument;
  const selectedNode = doc.querySelector(".node-selected");
  // 取消之前的选择
  if (selectedNode) {
    selectedNode.classList.remove("node-selected");
  }

  // 设置新选择
  node.classList.add("node-selected");
}

// 添加新节点
function addNewNode(doc: Document) {
  const newTitle = "新书签";
  const selectedNode = doc.querySelector(".node-selected");
  const location = getReaderPagePosition();

  // 如果没有选中节点，添加到根
  if (!selectedNode) {
    const rootList = doc.getElementById("root-list")!;
    createTreeNodes(
      [
        {
          level: 1,
          title: newTitle,
          page: location.position.pageIndex + 1,
          x: location.position.rects[0][0],
          y: location.position.rects[0][1],
        },
      ],
      rootList,
      doc,
    );
    doc.querySelector(".empty-outline-prompt")?.classList.add("hidden");
  } else {
    // 添加为选中节点的子节点或兄弟节点
    const parentLi = selectedNode.closest("li")!;
    const parentLevel = parseInt(
      selectedNode.querySelector("span.node-title")!.getAttribute("level") ||
        "1",
    );

    // 检查是否有子列表，如果没有，创建一个
    let childList = parentLi.querySelector("ul");
    if (!childList) {
      childList = ztoolkit.UI.createElement(doc, "ul", {
        classList: ["tree-list"],
      });
      parentLi.appendChild(childList);

      // 添加父节点标记并更新展开图标
      parentLi.classList.add("has-children");
      const expander = parentLi.querySelector(".expander")!;
      expander.textContent = "▼";
    }

    createTreeNodes(
      [
        {
          level: parentLevel + 1,
          title: newTitle,
          page: location.position.pageIndex + 1,
          x: location.position.rects[0][0],
          y: location.position.rects[0][1],
        },
      ],
      childList,
      doc,
    );
    // 确保父节点展开
    parentLi.classList.remove("collapsed");
  }
}

// 删除选中节点
// TODO: 全部节点删除时，显示提示信息.
function deleteSelectedNode(doc: Document) {
  const selectedNode = doc.querySelector(".node-selected");
  const rootNode = doc.getElementById("root-list");
  if (!selectedNode || !rootNode) return;

  const listItem = selectedNode.closest("li")!;
  const parent = listItem.parentNode as HTMLElement;

  // 移除节点
  parent.removeChild(listItem);

  // 如果父列表没有其他子元素，更新其父节点的状态
  if (
    parent.children.length === 0 &&
    parent.tagName === "UL" &&
    parent !== doc.getElementById("root-list")
  ) {
    const parentLi = parent.parentNode as HTMLElement;
    parentLi.removeChild(parent);
    parentLi.classList.remove("has-children");
    const expander = parentLi.querySelector(".expander")!;
    expander.textContent = " ";
  }

  if (!rootNode.hasChildNodes()) {
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        namespace: "html",
        classList: ["empty-outline-prompt"],
        properties: { innerHTML: `请点击上方按钮${ICONS.add}创建书签` },
      },
      rootNode,
    );
  }
}

function makeNodeEditable(titleElement: Element) {
  const doc = titleElement.ownerDocument;
  const parent = titleElement.parentNode! as Element;
  const treeNode = titleElement.closest("div.tree-node")!;
  // 获取当前值
  const currentTitle = titleElement.textContent || "";
  const currentPage = treeNode.getAttribute("page")!;

  // 创建容器
  const container = doc.createElement("div");
  container.style.display = "flex";
  container.style.gap = "5px";

  // 创建标题输入框
  const titleInput = doc.createElement("input");
  titleInput.type = "text";
  titleInput.value = currentTitle;
  titleInput.placeholder = "输入标题";

  // 创建页码输入框
  // const pageInput = doc.createElement("input");
  // pageInput.type = "number";
  // pageInput.value = currentPage;
  // pageInput.placeholder = "页码";
  // pageInput.style.width = "45px"; // 限制页码输入框宽度

  // 替换原始元素
  container.appendChild(titleInput);
  // container.appendChild(pageInput);
  parent.replaceChild(container, titleElement);

  // 聚焦到标题输入框
  titleInput.focus();
  // 禁用拖拽功能
  treeNode.setAttribute("draggable", "false");

  // 保存逻辑
  const saveChanges = async () => {
    const newTitle = titleInput.value.trim();
    // const newPage = pageInput.value.trim();

    // 更新原始元素
    titleElement.textContent = newTitle || currentTitle;
    titleElement.setAttribute("title", `${newTitle}, Page: ${currentPage}`);
    treeNode.setAttribute("page", currentPage);

    // 恢复 DOM 结构
    parent.replaceChild(titleElement, container);
    // 恢复拖拽功能
    treeNode.setAttribute("draggable", "true");
    // 保存节点信息
    await saveOutlineToJSON();
  };

  // 事件处理
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      saveChanges();
    } else if (e.key === "Escape") {
      parent.replaceChild(titleElement, container);
    }
  };

  const handleBlur = (e: FocusEvent) => {
    if (!container.contains(e.relatedTarget as Node)) {
      saveChanges();
    }
  };

  // 绑定事件
  titleInput.addEventListener("keydown", handleKeyDown);
  container.addEventListener("blur", handleBlur, true);
}

// 拖拽开始，处理拖拽的节点
function handleDragStart(e: DragEvent) {
  // if (!(e.target instanceof HTMLElement)) return;
  ztoolkit.log(" start to drag");
  const target = e.target as Element;
  if (!target.classList.contains("tree-node")) return;

  const draggedNode = target.closest("li") as HTMLElement;
  e.dataTransfer!.setData("text/plain", draggedNode.innerText);
  e.dataTransfer!.effectAllowed = "move";

  // 为拖拽中的元素添加样式
  setTimeout(() => {
    draggedNode.classList.add("dragging");
  }, 0);
}

// 拖拽经过目标元素
function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = "move";
  const target = e.target as HTMLElement;
  const doc = target.ownerDocument;
  // 修复坐标异常
  const upperHeight =
    doc.querySelector("html")?.getBoundingClientRect().height || 41;
  const draggedNode = doc.querySelector(".dragging");
  if (!draggedNode) return;

  // if (!(e.target instanceof HTMLElement)) return;
  // 找到最近的节点元素
  const targetNode = target.closest(".tree-node");
  if (!targetNode) {
    hideDropIndicator(doc);
    return;
  }

  // 不能拖拽到自己或自己的子元素
  const targetLi = targetNode.closest("li") as Element;
  if (draggedNode === targetLi || isAncestor(draggedNode, targetLi)) {
    hideDropIndicator(doc);
    return;
  }

  // 计算拖拽位置（上方、中间放入其中、下方）
  const rect = targetNode.getBoundingClientRect();
  const mouseY = e.clientY;
  const relativeY = mouseY - rect.top;
  const height = rect.height;

  let dropPosition;
  if (relativeY < height * 0.25) {
    dropPosition = "before";
  } else if (relativeY > height * 0.75) {
    dropPosition = "after";
  } else {
    dropPosition = "inside";
  }

  // 如果位置或目标变化了，才更新指示器
  // 临时数据暂时存储在window中
  if (
    doc.defaultView!.lastDropPosition !== dropPosition ||
    doc.defaultView!.lastDropTarget !== targetLi
  ) {
    updateDropIndicator(targetNode, dropPosition, upperHeight);
    doc.defaultView!.lastDropPosition = dropPosition;
    doc.defaultView!.lastDropTarget = targetLi;
  }

  // 添加可放置样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
  targetNode.classList.add("dragover");
}

function updateDropIndicator(
  targetNode: Element,
  position: string,
  upperHeight: number,
) {
  const rect = targetNode.getBoundingClientRect();
  const doc = targetNode.ownerDocument;
  const dropIndicator = doc.querySelector(".drop-indicator") as HTMLElement;

  // 清除所有位置类
  dropIndicator.classList.remove("top", "middle", "bottom");
  dropIndicator.classList.add("visible");
  ztoolkit.log(
    "updateDropIndicator",
    targetNode.textContent,
    position,
    rect.toJSON(),
  );
  if (position === "before") {
    dropIndicator.classList.add("top");
    dropIndicator.style.left = `${rect.left}px`;
    dropIndicator.style.top = `${rect.top - 2 - upperHeight}px`;
    dropIndicator.style.width = `${rect.width}px`;
  } else if (position === "after") {
    dropIndicator.classList.add("bottom");
    dropIndicator.style.left = `${rect.left}px`;
    dropIndicator.style.top = `${rect.bottom - upperHeight}px`;
    dropIndicator.style.width = `${rect.width}px`;
  } else {
    // inside position
    dropIndicator.classList.add("middle");
    dropIndicator.style.left = `${rect.left + 20}px`;
    dropIndicator.style.top = `${rect.top + rect.height / 2 - upperHeight}px`;
    dropIndicator.style.width = `${rect.width - 25}px`;
  }
}

function hideDropIndicator(doc: Document) {
  const dropIndicator = doc.querySelector(".drop-indicator")!;
  dropIndicator.classList.remove("visible");
  doc.defaultView!.lastDropPosition = null;
  doc.defaultView!.lastDropTarget = null;
}

// 拖拽离开目标元素
function handleDragLeave(e: DragEvent) {
  const doc = (e.target as Element).ownerDocument;
  if (
    !e.relatedTarget ||
    !(e.relatedTarget as Element).closest("#j-outline-viewer")
  ) {
    hideDropIndicator(doc);
  }

  const targetNode = (e.target as HTMLElement).closest(".tree-node");
  if (targetNode) {
    // 移除可放置样式
    targetNode.classList.remove("dragover");
  }
}

// 处理放置
async function handleDrop(e: DragEvent) {
  e.preventDefault();
  // if (!(e.target instanceof HTMLElement)) return;
  const target = e.target as HTMLElement;
  const doc = target.ownerDocument;
  const draggedNode = doc.querySelector(".dragging");

  // 隐藏指示器
  hideDropIndicator(doc);

  if (!draggedNode) return;
  // 获取目标节点
  const targetTreeNode = target.closest(".tree-node");
  if (!targetTreeNode) return;

  // 移除可放置样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
  // 获取目标列表项
  const targetLi = targetTreeNode.closest("li")!;

  // 不能将节点拖到自己或其子节点上
  if (draggedNode === targetLi || isAncestor(draggedNode, targetLi)) {
    return;
  }

  // 移除拖拽的节点
  const oldParent = draggedNode.parentNode! as HTMLElement;
  oldParent.removeChild(draggedNode);

  // 判断放置位置：是作为子节点还是兄弟节点
  const dropPosition = determineDropPosition(e, targetTreeNode);

  if (dropPosition === "child") {
    // 作为子节点
    let targetUl = targetLi.querySelector("ul");

    // 如果没有子列表，创建一个
    if (!targetUl) {
      targetUl = doc.createElement("ul");
      targetUl.classList.add("tree-list");
      targetLi.appendChild(targetUl);

      // 更新父节点状态
      targetLi.classList.add("has-children");
      const expander = targetLi.querySelector(".expander")!;
      expander.textContent = "▼";
    }

    // 确保目标节点展开
    targetLi.classList.remove("collapsed");

    // 添加到子列表
    targetUl.appendChild(draggedNode);
  } else {
    // 作为兄弟节点
    const targetParent = targetLi.parentNode!;

    if (dropPosition === "before") {
      targetParent.insertBefore(draggedNode, targetLi);
    } else {
      // 'after'
      targetParent.insertBefore(draggedNode, targetLi.nextSibling);
    }
  }

  // 如果原父列表为空，更新其父节点状态
  if (
    oldParent.children.length === 0 &&
    oldParent.tagName === "UL" &&
    oldParent !== doc.getElementById("root-list")
  ) {
    const oldGrandParent = oldParent.parentNode as HTMLElement;
    oldGrandParent.removeChild(oldParent);
    oldGrandParent.classList.remove("has-children");
    const expander = oldGrandParent.querySelector(".expander")!;
    expander.textContent = " ";
  }

  // 更新节点级别样式
  updateNodeLevels(draggedNode);

  // 保存节点信息
  await saveOutlineToJSON();
}

// 拖拽结束
function handleDragEnd(e: DragEvent) {
  // if (!(e.target instanceof HTMLElement)) return;
  const doc = (e.target as HTMLElement).ownerDocument;
  const draggedNode = doc.querySelector(".dragging");
  if (!draggedNode) return;

  draggedNode.classList.remove("dragging");

  // 隐藏指示器
  hideDropIndicator(doc);

  // 清除所有dragover样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
}

// 检查一个节点是否是另一个节点的祖先
function isAncestor(ancestor: Element, descendant: Element) {
  let current = descendant.parentNode;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

// 确定放置位置：作为子节点、同级前面或同级后面
function determineDropPosition(event: DragEvent, targetNode: Element) {
  const rect = targetNode.getBoundingClientRect();
  const mouseY = event.clientY;

  // 上三分之一区域放在前面，下三分之一区域放在后面，中间放在内部
  const relativeY = mouseY - rect.top;
  const height = rect.height;

  if (relativeY < height / 3) {
    return "before";
  } else if (relativeY > (height * 2) / 3) {
    return "after";
  } else {
    return "child";
  }
}

// 更新节点及其子节点的级别样式
function updateNodeLevels(node: Element) {
  const updateLevel = (element: Element, level: number) => {
    const nodeDiv = element.querySelector(".tree-node")!;

    // 移除所有级别类
    for (let i = 1; i <= MAX_LEVEL; i++) {
      nodeDiv.classList.remove(`level-${i}`);
    }

    // 添加正确的级别类
    nodeDiv.classList.add(`level-${level}`);
    nodeDiv.setAttribute("level", level.toString());

    // 递归处理子节点
    const childList = element.querySelector("ul");
    if (childList) {
      Array.from(childList.children).forEach((child) => {
        updateLevel(child, level + 1);
      });
    }
  };

  // 计算当前节点的级别
  let level = 1;
  let parent = node.parentNode as Element;

  while (parent && parent.id !== "root-list") {
    if (parent.tagName === "UL") {
      level++;
    }
    parent = parent.parentNode as Element;
  }

  updateLevel(node, level);
}

export const outline_css = `
:root {
  /* Light mode variables */
  --background-color: #f5f5f5;
  --container-bg: white;
  --text-color: #333;
  --heading-color: #2c3e50;
  --border-color: #ddd;
  --button-bg: #e8f4fd;
  --button-hover-bg: #e8f4fd;
  --node-hover-bg: #f0f0f0;
  --selected-node-bg: #e8f4fd;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --dragover-bg: rgba(52, 152, 219, 0.1);
  --drop-indicator-color: #3498db;
}

#j-outline-viewer {
  max-width: 1000px;
  margin: 0 auto;
  background: var(--container-bg);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 10px var(--shadow-color);
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  padding: 2px 8px 8px 8px;
  transition:
    background-color 0.3s,
    color 0.3s;
}

[data-theme="dark"] {
  /* Dark mode variables */
  --background-color: #1a1a1a;
  --container-bg: #2c2c2c;
  --text-color: #e0e0e0;
  --heading-color: #90caf9;
  --border-color: #444;
  --button-bg: #2196f3;
  --button-hover-bg: #1976d2;
  --node-hover-bg: #3e3e3e;
  --selected-node-bg: #2a4055;
  --shadow-color: rgba(0, 0, 0, 0.3);
  --dragover-bg: rgba(33, 150, 243, 0.2);
  --drop-indicator-color: #64b5f6;
}

.j-outline-hidden {
display: none !important;}

#j-outline-toolbar {
  display: inline-flex;
  gap: 6px;
  padding: 4px 4px 4px 8px;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
}

.j-outline-toolbar-button {
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.j-outline-toolbar-button svg {
  display: block;
  width: 24px;
  height: 24px;
}

button:hover.j-outline-toolbar-button {
  background: var(--button-hover-bg);
}

.tree-container {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 15px;
  background: var(--container-bg);
  width: 350px;
  overflow: auto;
  transition:
    background 0.3s,
    border-color 0.3s;
}
.tree-list {
  list-style-type: none;
  padding-left: 0;
  position: relative;
}
.tree-list li {
  margin: 5px 0;
  position: relative;
}
.tree-list ul {
  list-style-type: none;
  padding-left: 25px;
  padding-top: 5px;
  position: relative;
}
.tree-node {
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.2s,
    border-left-color 0.2s;
  border-left: 4px solid transparent;
  position: relative;
}
.tree-node:hover {
  background: var(--node-hover-bg);
}
.node-selected {
  background: var(--selected-node-bg);
}
.tree-node.dragging {
  opacity: 0.5;
}
.dragover {
  background-color: var(--dragover-bg);
}
.drop-indicator {
  position: absolute;
  height: 2px;
  background-color: var(--drop-indicator-color);
  left: 0;
  right: 0;
  pointer-events: none;
  display: none;
  transition: background-color 0.3s;
}
.drop-indicator.visible {
  display: block;
}
.drop-indicator::before {
  content: "";
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--drop-indicator-color);
  left: -3px;
  top: -2px;
  transition: background-color 0.3s;
}
.drop-indicator.top {
  top: 0;
}
.drop-indicator.bottom {
  bottom: 0;
}
.drop-indicator.middle {
  top: 50%;
  box-shadow: 0 0 3px var(--shadow-color);
}
.expander {
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-right: 5px;
  text-align: center;
  line-height: 16px;
  font-size: 12px;
  flex-shrink: 0;
}
.node-content {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
}
.node-title {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.node-edit {
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  font-family: inherit;
  font-size: inherit;
  width: 100%;
  background-color: var(--container-bg);
  color: var(--text-color);
}
/* Rainbow hierarchy indicators for different levels - maintained in both themes */
.level-1 {
  font-weight: bold;
  font-size: 16px;
  border-left-color: #ff5252; /* Red */
}
.level-2 {
  font-size: 15px;
  border-left-color: #ff9800; /* Orange */
}
.level-3 {
  font-size: 14px;
  border-left-color: #ffeb3b; /* Yellow */
}
.level-4 {
  font-size: 13px;
  border-left-color: #4caf50; /* Green */
}
.level-5 {
  font-size: 12px;
  border-left-color: #2196f3; /* Blue */
}
.level-7 {
  font-size: 12px;
  border-left-color: #673ab7; /* Purple */
}
.level-7 {
  font-size: 12px;
  border-left-color: #e91e63; /* Pink */
}
.collapsed > ul {
  display: none;
}

.hidden {
  display: none
}
`;
