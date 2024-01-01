function isCNKIFile(item: Zotero.Item) {
  // Return true, when item is OK for update cnki data.
  if (!item.isAttachment() || item.isRegularItem() || !item.isTopLevelItem()) {
    return false;
  }

  const filename = item.attachmentFilename;
  // Find Chinese characters in string
  if (escape(filename).indexOf("%u") < 0) return false;
  // Extension should be CAJ , PDF, kdh, nh
  const ext = filename.match(/\.(\w+)$/)![1];
  if (!["pdf", "caj", "kdh", "nh"].includes(ext)) return;
  return true;
}

/**
 * Return true when item is top level item.
 * @param {Zotero.item}
 * @return {bool}
 */
function isRegularTopItem(item: Zotero.Item) {
  return !item.isAttachment() && item.isRegularItem() && item.isTopLevelItem();
}

/**
 * Return true when item is a CNKI PDF attachment.
 * @param {Zotero.item}
 * @return {bool}
 */
export function isCNKIPDF(item: Zotero.Item): boolean {
  return (!item.isTopLevelItem() &&
    item.isAttachment() &&
    item.attachmentContentType &&
    item.attachmentContentType === "application/pdf" &&
    Zotero.ItemTypes.getName(item.parentItem!.itemTypeID) ===
      "thesis") as boolean;
}

function isCNKIWeb(item: Zotero.Item) {
  return (
    item.isTopLevelItem() &&
    item.isRegularItem() &&
    Zotero.ItemTypes.getName(item.itemTypeID) === "webpage" &&
    (item.getField("title") as string).endsWith("中国知网")
  );
}

function test(): boolean {
  const items = ZoteroPane.getSelectedItems();
  Zotero.debug("******Click test to show menu!");
  return items.some((item) => isCNKIFile(item) || isCNKIWeb(item));
}

/**
 * get items from different type
 * @param {string} items or collection
 * @return {[Zotero.item]}
 */
export function getItems(type = "items", regular = false) {
  let items: Zotero.Item[] = [];
  if (type === "items") {
    ztoolkit.log("getItems items");
    items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
  } else if (type === "collection") {
    ztoolkit.log("getItems collection");
    const collection = ztoolkit.getGlobal("ZoteroPane").getSelectedCollection();
    if (collection) items = collection.getChildItems();
  }
  // 只保留元数据条目
  // 用于解决多选项目时选中附件类条目导致小组件修改错误，使得批量修改中断。
  if (regular) items = items.filter((item) => item.isRegularItem());
  return items;
}
