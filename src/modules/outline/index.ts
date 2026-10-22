import { openOutlineTask } from "./taskView";
import { wait } from "zotero-plugin-toolkit";
import { getString } from "../../utils/locale";
import { initEventListener } from "./events";
import {
  addButton,
  createTreeNodes,
  getOutlineFromPDF,
  registerOutlineCSS,
  registerThemeChange,
  updateOutlineFontSize,
  loadOutlineInfoFromJSON,
  DEFAULT_BASE_FONT_SIZE,
} from "./outline";
import {
  addBookmarkButton,
  createBookmarkNodes,
  loadBookmarksFromJSON,
  updateBookmarkFontSize,
  loadBookmarkInfoFromJSON,
  DEFAULT_BOOKMARK_FONT_SIZE,
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
        properties: { innerHTML: ICONS.outlineAdd },
        attributes: { title: getString("outline-add") },
      },
      {
        tag: "button",
        id: "j-outline-delete-node",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.outlineDelete },
        attributes: { title: getString("outline-delete") },
      },
      {
        tag: "button",
        id: "j-outline-ai",
        classList: ["j-outline-toolbar-button", "toolbar-button"],
        properties: { innerHTML: ICONS.ai },
        attributes: {
          title: getString("outline-ai-title"),
          "aria-label": getString("outline-ai-title"),
        },
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
  const more = doc.createElement("button");
  more.id = "j-outline-more";
  more.type = "button";
  more.className = "j-outline-toolbar-button toolbar-button";
  more.innerHTML = ICONS.more;
  more.title = getString("outline-more-actions");
  more.setAttribute("aria-label", more.title);
  more.setAttribute("aria-haspopup", "menu");
  more.setAttribute("aria-expanded", "false");
  more.setAttribute("aria-controls", "j-outline-more-menu");
  const menu = doc.createElement("div");
  menu.id = "j-outline-more-menu";
  menu.setAttribute("popover", "auto");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", more.title);
  for (const id of ["j-outline-ai", "j-outline-save-pdf"]) {
    const button = toolbar.querySelector<HTMLButtonElement>(`#${id}`)!;
    button.setAttribute("role", "menuitem");
    const label = doc.createElement("span");
    label.textContent = button.title;
    button.append(label);
    button.addEventListener("click", () => menu.hidePopover());
    menu.append(button);
  }
  toolbar.append(more, menu);
  more.addEventListener("click", (event) => {
    if (menu.matches(":popover-open")) {
      menu.hidePopover();
      return;
    }
    menu.showPopover();
    const anchor = more.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const win = doc.defaultView!;
    menu.style.left = `${Math.max(8, Math.min(anchor.right - bounds.width, win.innerWidth - bounds.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(anchor.bottom + 4, win.innerHeight - bounds.height - 8))}px`;
    // Keyboard activation has no pointer click count. Mouse users keep focus
    // on the trigger instead of immediately highlighting the first menu item.
    if (event.detail === 0) {
      menu.querySelector<HTMLButtonElement>("button")?.focus();
    }
  });
  more.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!menu.matches(":popover-open")) more.click();
    const selector =
      event.key === "ArrowDown" ? "button:first-child" : "button:last-child";
    menu.querySelector<HTMLButtonElement>(selector)?.focus();
  });
  menu.addEventListener("toggle", () => {
    more.setAttribute("aria-expanded", String(menu.matches(":popover-open")));
  });
  menu.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(
      menu.querySelectorAll<HTMLButtonElement>("button"),
    );
    const index = buttons.indexOf(doc.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length;
    (buttons[next] as HTMLButtonElement | undefined)?.focus();
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
  toolbar
    .querySelector("#j-outline-ai")
    ?.addEventListener("click", () => openOutlineTask(reader._item));
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

const pendingReaders = new WeakMap<
  _ZoteroTypes.ReaderInstance,
  Promise<void>
>();

export function addOutlineToReader(
  reader: _ZoteroTypes.ReaderInstance,
): Promise<void> {
  const pending = pendingReaders.get(reader);
  if (pending) return pending;
  const operation = initializeOutline(reader).finally(() =>
    pendingReaders.delete(reader),
  );
  pendingReaders.set(reader, operation);
  return operation;
}

async function initializeOutline(reader: _ZoteroTypes.ReaderInstance) {
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

  const joutline = await getOutlineFromPDF(reader);
  if (!joutline) {
    ztoolkit.log("No outline to add.");
  }
  ztoolkit.log("++joutline", joutline);

  const bookmarks = await loadBookmarksFromJSON(reader._item);
  ztoolkit.log("++bookmarks", bookmarks);

  // Load baseFontSize from JSON for outline
  const outlineInfo = await loadOutlineInfoFromJSON(reader._item);
  const outlineBaseFontSize =
    outlineInfo?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE;

  // Load baseFontSize from JSON for bookmark
  const bookmarkInfo = await loadBookmarkInfoFromJSON(reader._item);
  const bookmarkBaseFontSize =
    bookmarkInfo?.baseFontSize ?? DEFAULT_BOOKMARK_FONT_SIZE;

  addButton(doc);
  addBookmarkButton(doc);

  registerOutlineCSS(doc);
  registerThemeChange(reader._iframeWindow!);

  // Apply dynamic font size for both outline and bookmark
  updateOutlineFontSize(doc, outlineBaseFontSize);
  updateBookmarkFontSize(doc, bookmarkBaseFontSize);

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
      await addOutlineToReader(reader);
    }
    // Click toggle button to open sidebar.
    doc
      ?.getElementById("sidebarToggle")
      ?.addEventListener("click", (ev: Event) => {
        ztoolkit.log("outline is added by toggle click");
        void addOutlineToReader(reader).catch((error) =>
          ztoolkit.log("Unable to initialize outline", error),
        );
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
