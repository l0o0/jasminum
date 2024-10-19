import { getItems } from "../utils/tools";

/**
 * Show item menu according item type
 * @return {void}
 */
export function displayMenuitem() {
  // const pane = ztoolkit.getGlobal("ZoteroPane");
  const paneDocument = ZoteroPane.document as Document;
  const items = ZoteroPane.getSelectedItems();
  ztoolkit.log("**Jasminum selected item length: " + items.length);
  // Menu for get CNKI metadata
  const showSearch = items.some(
    (item: Zotero.Item) => isCNKIFile(item) || isCNKIWeb(item)
  );
  paneDocument.getElementById("jasminum-itemmenu-searchCNKI")!.hidden = !showSearch;

  // Menu for Chinese name
  const showName = items.some((item: Zotero.Item) => isCNKIName(item));
  // Keep toolbox always visible
  // pane.document.getElementById(
  //     "jasminum-popup-menu2"
  // ).hidden = !showName; // 小工具弹出菜单
  paneDocument.getElementById("jasminum-itemmenu-updateCiteCSSCI")!.hidden =
    !showName;
  // pane.document.getElementById("jasminum-itemmenu-attachment")!.hidden =
  //   !showName;
  // Menu for PDF bookmark
  let showBookmark = false;
  if (items.length === 1) {
    showBookmark = isCNKIPDF(items[0]);
    paneDocument.getElementById("jasminum-itemmenu-bookmark")!.hidden =
      !showBookmark;
  }

  const isDisplayMenu = showSearch || showName || showBookmark;
  // pane.document.getElementById("jasminum-separator").hidden = !isDisplayMenu;
  paneDocument.getElementById("jasminum-popup-menu-cnki")!.hidden = !isDisplayMenu;

  const showTools = items.some(i => i.isRegularItem());
  paneDocument.getElementById("jasminum-popup-menu-tools")!.hidden = !showTools;

  ztoolkit.log(
    `show menu: search ${showSearch} name ${showName} boomark ${showBookmark}`
  );
}

/**
 * Show item menu according item type (Collection)
 * @return {void}
 */
function displayCollectionMenuitem() {
  const items = getItems("collection", true);
  const isEmptyItems = items.length == 0;
  ztoolkit.log(isEmptyItems);
  (ZoteroPane.document as Document).getElementById("jasminum-popup-collection-menu")!.hidden =
    isEmptyItems;
  (ZoteroPane.document as Document).getElementById("jasminum-separator-collection")!.hidden =
    isEmptyItems;
}

/**
 * Return true when item is a single CNKI file
 * Filename contains Chinese characters and ends with pdf/caj
 * @param {Zotero.item}
 * @return {bool}
 */
export function isCNKIFile(item: Zotero.Item): boolean {
  // Return true, when item is OK for update cnki data.
  if (!item.isAttachment() || item.isRegularItem() || !item.isTopLevelItem()) {
    return false;
  }

  const filename = item.attachmentFilename;
  // Find Chinese characters in string
  if (escape(filename).indexOf("%u") < 0) return false;
  // Extension should be CAJ , PDF, kdh, nh
  const ext = filename.match(/\.(\w+)$/)![1];
  if (!["pdf", "caj", "kdh", "nh"].includes(ext)) return false;
  return true;
}

/**
 * Return true when item is top level item.
 * @param {Zotero.item}
 * @return {bool}
 */
export function isCNKIName(item: Zotero.Item): boolean {
  return !item.isAttachment() && item.isRegularItem() && item.isTopLevelItem();
}

/**
 * Return true when item is a CNKI PDF attachment.
 * @param {Zotero.item}
 * @return {bool}
 */
export function isCNKIPDF(item: Zotero.Item): boolean {
  return (
    !item.isTopLevelItem() &&
    item.isAttachment() &&
    item.attachmentContentType &&
    item.attachmentContentType === "application/pdf" &&
    Zotero.ItemTypes.getName(item.parentItem!.itemTypeID) === "thesis"
  ) ? true : false;
}

export function isCNKIWeb(item: Zotero.Item): boolean {
  return (
    item.isTopLevelItem() &&
    item.isRegularItem() &&
    Zotero.ItemTypes.getName(item.itemTypeID) === "webpage" &&
    (item.getField("title") as string).endsWith("中国知网")
  ) ? true : false;
};
