import { version } from "../../../package.json";
import { getString } from "../../utils/locale";
import { ICONS } from "./style";

export const BOOKMARK_SCHEMA = 1;

// 学生友好的清新现代颜色
export const DEFAULT_BOOKMARK_COLORS = [
  "#FF6B6B", // 珊瑚红
  "#4ECDC4", // 薄荷绿
  "#45B7D1", // 天空蓝
  "#96CEB4", // 薄荷色
  "#FECA57", // 向日葵黄
  "#FF9FF3", // 粉紫色
  "#54A0FF", // 宝蓝色
  "#5F27CD", // 紫罗兰
  "#00D2D3", // 青绿色
  "#FF9F43", // 橙色
  "#10AC84", // 翡翠绿
  "#EE5A24", // 朱砂橙
];

// 获取随机颜色
function getRandomBookmarkColor(): string {
  const randomIndex = Math.floor(
    Math.random() * DEFAULT_BOOKMARK_COLORS.length,
  );
  return DEFAULT_BOOKMARK_COLORS[randomIndex];
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
  const pageIndex = PDFViewerApplication.pdfViewer!.currentPageNumber - 1;
  const pageView = PDFViewerApplication.pdfViewer!.getPageView(pageIndex);
  const viewport = pageView.viewport;
  const scrollX = 0;
  const scrollY = container.scrollTop - pageView.div.offsetTop;
  const [x, y] = viewport.convertToPdfPoint(scrollX, scrollY);
  return { position: { pageIndex, rects: [[x, y, x, y]] } };
}

export async function saveBookmarksToJSON(
  item?: Zotero.Item,
  bookmarks?: BookmarkNode[],
) {
  if (!bookmarks) {
    bookmarks = getBookmarksFromPage();
  }
  if (!item) {
    const reader = Zotero.Reader.getByTabID(
      ztoolkit.getGlobal("Zotero_Tabs").selectedID,
    );
    item = reader._item;
  }
  const bookmarkInfo: BookmarkInfo = {
    info: {
      itemID: item.id,
      schema: BOOKMARK_SCHEMA,
      jasminumVersion: version,
    },
    bookmarks: bookmarks,
  };
  const bookmarkStr = JSON.stringify(bookmarkInfo);
  const bookmarkPath = PathUtils.join(
    Zotero.DataDirectory.dir,
    "storage",
    item.key,
    "jasminum-bookmarks.json",
  );
  await Zotero.File.putContentsAsync(bookmarkPath, bookmarkStr);
  ztoolkit.log("Save bookmarks to JSON");
}

export async function loadBookmarksFromJSON(
  item: Zotero.Item,
): Promise<BookmarkNode[] | null> {
  const bookmarkPath = PathUtils.join(
    Zotero.DataDirectory.dir,
    "storage",
    item.key,
    "jasminum-bookmarks.json",
  );
  const isFileExist = await IOUtils.exists(bookmarkPath);
  if (!isFileExist) {
    ztoolkit.log(`Bookmarks json is missing: ${bookmarkPath}`);
    return null;
  } else {
    const content = (await Zotero.File.getContentsAsync(
      bookmarkPath,
    )) as string;
    const tmp = JSON.parse(content);
    if (tmp.info.schema < BOOKMARK_SCHEMA) {
      return null;
    } else {
      const bookmarks: BookmarkNode[] = JSON.parse(content)["bookmarks"];
      // 为向后兼容性添加默认颜色
      return bookmarks.map((bookmark) => ({
        ...bookmark,
        color: bookmark.color || getRandomBookmarkColor(),
      }));
    }
  }
}

export function getBookmarksFromPage(): BookmarkNode[] {
  const reader = Zotero.Reader.getByTabID(
    ztoolkit.getGlobal("Zotero_Tabs").selectedID,
  );
  const rootUL = reader._iframeWindow!.document.querySelector(
    "#bookmark-root-list",
  );
  if (!rootUL) return [];

  const bookmarkItems = Array.from(rootUL.querySelectorAll("li.bookmark-item"));
  if (bookmarkItems.length === 0) {
    ztoolkit.log("No bookmarks found on this page.");
    return [];
  }
  return bookmarkItems.map((li, index) => {
    const bookmarkDiv = (li as Element).querySelector("div.bookmark-node")!;
    const titleSpan = (li as Element).querySelector("span.bookmark-title")!;
    return {
      id: bookmarkDiv.getAttribute("data-id")!,
      title: titleSpan.textContent!,
      page: parseInt(bookmarkDiv.getAttribute("page")!),
      x: parseFloat(bookmarkDiv.getAttribute("x")!),
      y: parseFloat(bookmarkDiv.getAttribute("y")!),
      order: index,
      createdAt: parseInt(bookmarkDiv.getAttribute("data-created") || "0"),
      color:
        bookmarkDiv.getAttribute("data-color") || DEFAULT_BOOKMARK_COLORS[0],
    };
  });
}

export function createBookmarkNodes(
  nodes: BookmarkNode[] | null,
  parentElement: HTMLElement,
  doc: Document,
) {
  if (nodes === null || nodes.length == 0) {
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        namespace: "html",
        classList: ["empty-bookmark-prompt"],
        properties: { innerHTML: `请点击上方按钮${ICONS.add}创建书签` },
      },
      parentElement,
    );
  } else {
    // 按order排序
    const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
    sortedNodes.forEach((node) => {
      const li = ztoolkit.UI.createElement(doc, "li", {
        namespace: "html",
        classList: ["bookmark-item"],
        children: [
          {
            tag: "div",
            namespace: "html",
            classList: ["bookmark-node"],
            attributes: {
              draggable: "true",
              "data-id": node.id,
              page: node.page,
              x: node.x,
              y: node.y,
              "data-created": node.createdAt,
              "data-color": node.color,
            },
            styles: {
              borderLeftColor: node.color,
            },
            children: [
              {
                tag: "div",
                namespace: "html",
                classList: ["bookmark-content"],
                children: [
                  {
                    tag: "span",
                    namespace: "html",
                    classList: ["bookmark-title"],
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
      parentElement.appendChild(li);
    });
  }
}

// 生成智能书签名称
function generateSmartBookmarkTitle(pageNumber: number): string {
  const existingBookmarks = getBookmarksFromPage();
  const baseName = `P_${pageNumber}_`;

  // 检查是否有重名
  const existingTitles = existingBookmarks.map((b) => b.title);

  // 找到下一个可用的数字后缀
  let counter = 1;
  let candidateName = `${baseName}${counter}`;
  while (existingTitles.includes(candidateName)) {
    counter++;
    candidateName = `${baseName}${counter}`;
  }

  return candidateName;
}

export function addNewBookmark(title?: string): BookmarkNode {
  const location = getReaderPagePosition();
  const now = Date.now();
  const pageNumber = location.position.pageIndex + 1;
  return {
    id: `bookmark_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title: title || generateSmartBookmarkTitle(pageNumber),
    page: pageNumber,
    x: location.position.rects[0][0],
    y: location.position.rects[0][1],
    order: now, // 使用时间戳作为默认排序
    createdAt: now,
    color: getRandomBookmarkColor(),
  };
}

export function addBookmarkButton(doc: Document) {
  if (doc.querySelector("#sidebarContainer div.start") === null) {
    ztoolkit.log("Sidebar toolbar button is missing.");
  }
  ztoolkit.UI.appendElement(
    {
      tag: "button",
      namespace: "html",
      id: "j-bookmark-button",
      classList: ["toolbar-button"],
      properties: { innerHTML: ICONS.bookmark },
      attributes: {
        title: getString("bookmark"),
        tabindex: "-1",
        role: "tab",
        "aria-selected": "false",
        "aria-controls": "j-bookmark-viewer",
      },
    },
    doc.querySelector("#sidebarContainer div.start")!,
  );
}
