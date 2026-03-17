import { wait } from "zotero-plugin-toolkit";
import { version } from "../../../package.json";
import { getString } from "../../utils/locale";
import { outline_css, ICONS } from "./style";

// 2 : Add base font size = 12
export const OUTLINE_SCHEMA = 2;
export const DEFAULT_BASE_FONT_SIZE = 12; // Default base font size for level-1

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

// Update font size dynamically based on baseFontSize
export function updateOutlineFontSize(doc: Document, baseFontSize: number) {
  const styleId = "jasminum-dynamic-font-size";
  let styleElement = doc.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = doc.createElement("style");
    styleElement.id = styleId;
    styleElement.type = "text/css";
    doc.querySelector("head")!.appendChild(styleElement);
  }

  // Calculate font sizes: level-1 = base, level-2 = base-1, level-3+ = base-2
  const level1Size = baseFontSize;
  const level2Size = baseFontSize - 1;
  const level3PlusSize = baseFontSize - 2;

  const dynamicCSS = `
    .level-1 { font-size: ${level1Size}px !important; }
    .level-2 { font-size: ${level2Size}px !important; }
    .level-3, .level-4, .level-5, .level-6, .level-7 {
      font-size: ${level3PlusSize}px !important;
    }
  `;

  styleElement.textContent = dynamicCSS;
  ztoolkit.log(`Updated font size: base=${baseFontSize}px`);
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
export function addButton(doc: Document) {
  if (doc.querySelector("#sidebarContainer div.start") === null) {
    ztoolkit.log("Sidebar toolbar button is missing.");
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
      // listeners: [
      //   {
      //     type: "click",
      //     listener: (e) => {
      //       ztoolkit.log("Button.click");
      //       ztoolkit.log(e);
      //       const d = (e.target! as HTMLButtonElement).ownerDocument;
      //       const viewer = d.getElementById("j-outline-viewer")?.parentElement;
      //       // 显示工具栏
      //       d
      //         .getElementById("j-outline-toolbar")
      //         ?.classList.toggle("j-outline-hidden", false);
      //       if (!viewer?.classList.contains("hidden")) {
      //         ztoolkit.log("Already display");
      //       } else {
      //         // 按钮的激活状态
      //         d
      //           .getElementById("viewThumbnail")
      //           ?.classList.toggle("active", false);
      //         d
      //           .getElementById("viewOutline")
      //           ?.classList.toggle("active", false);
      //         d
      //           .getElementById("viewAnnotations")
      //           ?.classList.toggle("active", false);
      //         d
      //           .getElementById("j-outline-button")
      //           ?.classList.toggle("active", true);
      //         // 书签内容显示
      //         d
      //           .getElementById("thumbnailsView")
      //           ?.parentElement?.classList.toggle("hidden", true);
      //         d
      //           .getElementById("annotationsView")
      //           ?.classList.toggle("hidden", true);
      //         d
      //           .getElementById("outlineView")
      //           ?.parentElement?.classList.toggle("hidden", true);
      //         viewer?.classList.toggle("hidden", false);

      //         ztoolkit.log("Display jasminum outline.");
      //       }
      //     },
      //   },
      // ],
    },
    doc.querySelector("#sidebarContainer div.start")!,
  );
}

// 有 JSON 文件优先读取JSON文件
// 然后再获取PDF自带书签
export async function getOutlineFromPDF(
  reader: _ZoteroTypes.ReaderInstance,
): Promise<OutlineNode[] | null> {
  const item = reader._item;
  // 优先从JSON缓存中读取书签信息
  const outlineJson = await loadOutlineFromJSON(item);
  if (outlineJson) return outlineJson;
  // 如果上面没有返回Outline信息，重新读取
  await wait.waitUtilAsync(
    () => {
      return (reader._primaryView as _ZoteroTypes.Reader.PDFView)
        ._iframeWindow &&
        (reader._primaryView as _ZoteroTypes.Reader.PDFView)._iframeWindow!
          .PDFViewerApplication.pdfDocument
        ? true
        : false;
    },
    200,
    5000,
  );
  ztoolkit.log("PDFViewerApplication is ready");
  const PDFViewerApplication = (
    reader._primaryView as _ZoteroTypes.Reader.PDFView
  )._iframeWindow!.PDFViewerApplication;
  await PDFViewerApplication.init;
  const pdfDocument = PDFViewerApplication.pdfDocument;
  if (!pdfDocument) {
    ztoolkit.log("No pdfDocument");
    return null;
  }
  // @ts-ignore - Not typed
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
      // @ts-ignore - Not typed
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
  baseFontSize?: number,
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
  // Get current baseFontSize if not provided
  if (baseFontSize === undefined) {
    const currentInfo = await loadOutlineInfoFromJSON(item);
    baseFontSize = currentInfo?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE;
  }
  const outlineInfo: OutlineInfo = {
    info: {
      itemID: item.id,
      schema: OUTLINE_SCHEMA,
      jasminumVersion: version,
      baseFontSize: baseFontSize,
    },
    outline: outline,
  };
  const outlineStr = JSON.stringify(outlineInfo);
  const outlinePath = PathUtils.join(
    Zotero.DataDirectory.dir,
    "storage",
    item.key,
    "jasminum-outline.json",
  );
  await Zotero.File.putContentsAsync(outlinePath, outlineStr);
  ztoolkit.log("Save outline to JSON");
}

function migrateOutlineInfo(
  raw: any,
  fromSchema: number,
): { outline: OutlineNode[]; baseFontSize: number } {
  let outline: OutlineNode[] = raw.outline ?? [];
  let baseFontSize = DEFAULT_BASE_FONT_SIZE;

  // v1 → v2: add baseFontSize
  if (fromSchema < 2) {
    baseFontSize = raw.info?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE;
  }

  // Future v2 → v3 migrations go here

  return { outline, baseFontSize };
}

// 加载时要考虑JSON文件的版本信息，如果版本低，要重新从原文件加载信息
export async function loadOutlineInfoFromJSON(
  item: Zotero.Item,
): Promise<{ outline: OutlineNode[]; baseFontSize: number } | null> {
  const outlinePath = PathUtils.join(
    Zotero.DataDirectory.dir,
    "storage",
    item.key,
    "jasminum-outline.json",
  );
  const isFileExist = await IOUtils.exists(outlinePath);
  if (!isFileExist) {
    ztoolkit.log(`Outline json is missing: ${outlinePath}`);
    return null;
  } else {
    const content = (await Zotero.File.getContentsAsync(outlinePath)) as string;
    const tmp = JSON.parse(content);
    const fileSchema = tmp.info?.schema ?? 1;
    if (fileSchema < OUTLINE_SCHEMA) {
      // Migrate old outline data instead of discarding
      const migrated = migrateOutlineInfo(tmp, fileSchema);
      await saveOutlineToJSON(item, migrated.outline, migrated.baseFontSize);
      return migrated;
    } else {
      const outlineInfo = JSON.parse(content) as OutlineInfo;
      return {
        outline: outlineInfo.outline,
        baseFontSize: outlineInfo.info.baseFontSize ?? DEFAULT_BASE_FONT_SIZE,
      };
    }
  }
}

export async function loadOutlineFromJSON(
  item: Zotero.Item,
): Promise<OutlineNode[] | null> {
  const info = await loadOutlineInfoFromJSON(item);
  return info?.outline ?? null;
}

export function createTreeNodes(
  nodes: OutlineNode[] | null,
  parentElement: HTMLElement,
  doc: Document,
) {
  if (nodes === null || nodes.length == 0) {
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
                  innerHTML:
                    node.children && node.children.length > 0
                      ? node.collapsed === false
                        ? ICONS.down
                        : ICONS.right
                      : " ",
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
