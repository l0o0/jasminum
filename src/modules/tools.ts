import { getPref } from "../utils/prefs";
import { config } from "../../package.json";
import { isChineseTopAttachment, isChineseTopItem } from "./menu";
import { getString } from "../utils/locale";

export async function splitChineseName(item: Zotero.Item): Promise<void> {
  const isSplitEnName = getPref("enNameSplit") || false;

  const creators = item.getCreators();
  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];
    creator.fieldMode = 0;
    if (
      // English Name
      isSplitEnName &&
      (creator.lastName.search(/[A-Za-z]/) >= 0 ||
        creator.firstName.search(/[A-Za-z]/) >= 0) &&
      creator.firstName === "" // 名为空
    ) {
      // 如果不拆分/合并英文名，则跳过
      const englishName = creator.lastName;
      const temp = englishName.split(/[\n\s+,]/g).filter(Boolean); // 过滤空字段
      creator.lastName = temp.pop()!;
      creator.firstName = temp.join(" ");
    } else if (creator.firstName === "") {
      // For Chinese Name,名为空
      const chineseName = creator.lastName || creator.firstName;
      creator.lastName = chineseName.charAt(0);
      creator.firstName = chineseName.slice(1);
    }
    creator.fieldMode = 0; // 0: two-field, 1: one-field (with empty first name)
    creators[i] = creator;
  }
  if (creators != item.getCreators()) {
    item.setCreators(creators);
    await item.saveTx();
  }
}

export async function mergeChineseName(item: Zotero.Item): Promise<void> {
  const isSplitEnName = getPref("enNameSplit") || false;
  const creators = item.getCreators();
  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];
    creator.fieldMode = 1;
    if (
      // English Name
      isSplitEnName &&
      (creator.lastName.search(/[A-Za-z]/) !== -1 ||
        creator.lastName.search(/[A-Za-z]/) !== -1)
    ) {
      // 如果不拆分/合并英文名，则跳过
      creator.lastName = creator.firstName + " " + creator.lastName;
    } else {
      // For Chinese Name
      creator.lastName = creator.lastName + creator.firstName;
    }
    creator.firstName = "";
    creator.fieldMode = 1; // 0: two-field, 1: one-field (with empty first name)
    creators[i] = creator;
  }
  if (creators != item.getCreators()) {
    item.setCreators(creators);
    await item.saveTx();
  }
}

export async function getCNKICite(item: Zotero.Item): Promise<string> {
  const searchOption = {
    title: item.getField("title"),
    author: item.getCreators()[0].lastName + item.getCreators()[0].firstName,
  };
  let cite = "";
  const searchResults = await addon.scraper.cnki?.search(searchOption);
  if (searchResults && searchResults.length > 0) {
    cite = searchResults[0].citation as string;
    ztoolkit.log(`CNKI citation: ${cite}`);
    if (cite) {
      ztoolkit.ExtraField.setExtraField(item, "CNKICite", cite);
    }
  }
  return cite;
}

export async function updateCNKICite(items: Zotero.Item[]) {
  const items2 = items.filter((i) => isChineseTopItem(i));
  if (items2.length > 0) {
    let popupWin;
    for (let i = 0; i < items2.length; i++) {
      const cite = await getCNKICite(items2[i]);
      if (i == 0) {
        popupWin = new ztoolkit.ProgressWindow(config.addonName, {
          closeOnClick: true,
          closeTime: 1500,
        })
          .createLine({
            text: `${getString("citation")}:${cite ? cite : "0"} ${items[i].getField("title")}`,
            type: "default",
            icon: `chrome://${config.addonRef}/content/icons/cite.png`,
          })
          .show();
      } else {
        popupWin?.changeLine({
          text: `${getString("citation")}:${cite ? cite : "0"} ${items[i].getField("title")}`,
          type: "default",
          icon: `chrome://${config.addonRef}/content/icons/cite.png`,
        });
      }
    }
  } else {
    ztoolkit.log("No Chinese items to update citation.");
    new ztoolkit.ProgressWindow(config.addonName, {
      closeOnClick: true,
      closeTime: 3500,
    })
      .createLine({
        text: getString("no-chinese-item-for-citation"),
        type: "default",
        icon: `chrome://${config.addonRef}/content/icons/cite.png`,
      })
      .show();
  }
}

async function renameAttachmentFromParent(attachmentItem: Zotero.Item) {
  if (
    !attachmentItem.isAttachment() ||
    attachmentItem.isTopLevelItem() ||
    attachmentItem.attachmentLinkMode == Zotero.Attachments.LINK_MODE_LINKED_URL
  ) {
    throw `Item ${attachmentItem.id} is not a child file attachment in ZoteroPane_Local.renameAttachmentFromParent()`;
  }

  const filePath = await attachmentItem.getFilePathAsync();
  if (!filePath) return;

  const parentItemID = attachmentItem.parentItemID as number;
  const parentItem = await Zotero.Items.getAsync(parentItemID);
  let newName = Zotero.Attachments.getFileBaseNameFromItem(parentItem);

  const extRE = /\.[^.]+$/;
  const origFilename = PathUtils.filename(filePath);
  const ext = origFilename.match(extRE);
  if (ext) {
    newName = newName + ext[0];
  }
  const origFilenameNoExt = origFilename.replace(extRE, "");

  const renamed = await attachmentItem.renameAttachmentFile(
    newName,
    false,
    true,
  );
  if (renamed !== true) {
    ztoolkit.log(`Could not rename file (${renamed})`);
  }

  // If the attachment title matched the filename, change it now
  const origTitle = attachmentItem.getField("title");
  if ([origFilename, origFilenameNoExt].includes(origTitle)) {
    attachmentItem.setField("title", newName);
    await attachmentItem.saveTx();
  }
}
