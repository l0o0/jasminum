// 这里有许多类型判断，判断不同的条目类型

/**
 * 主要检测知网等其他数据库下载的附件文件名是否至少有3个汉字
 * Created by DeepSeek
 * @param filename
 * @returns
 */

const CHINESE_FILENAME_REGEX =
  /^(?=(.*?\p{Unified_Ideograph}){3})(?=(.*\p{Unified_Ideograph}){3}).+\.(pdf|caj|kdh|nh)$/iu;
export function isChineseAttachmentFilename(filename: string): boolean {
  return CHINESE_FILENAME_REGEX.test(filename);
}

/**
 * Return true when item is a top level Chinese PDF/CAJ item.
 */
export function isChineseTopAttachment(item: Zotero.Item): boolean {
  return (
    item.isAttachment() &&
    item.isTopLevelItem() &&
    isChineseAttachmentFilename(item.attachmentFilename)
  );
}

/**
 * 检测是否是中文的顶层条目
 * @param item
 * @returns
 */
export function isChineseTopItem(item: Zotero.Item): boolean {
  return (
    item.isRegularItem() &&
    item.isTopLevelItem() &&
    /\p{Unified_Ideograph}/iu.test(item.getField("title"))
  );
}

/**
 * CNKI Snapshot attachment item，注意是附件条目
 * CNKI Webpage top level item. 注意是网页类型条目
 * @param item
 * @returns
 */
export function isChinsesSnapshot(item: Zotero.Item): boolean {
  return (
    (item.isSnapshotAttachment() &&
      item.getField("title").includes("- 中国知网")) ||
    (item.isTopLevelItem() &&
      item.itemType == "webpage" &&
      item.getField("title").includes("- 中国知网"))
  );
}
