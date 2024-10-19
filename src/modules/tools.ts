import { getPref } from "../utils/prefs";
import { getItems } from "../utils/tools";
// import { guess } from "./nlp";

// Functions used in menu
export async function concatName(items: Zotero.Item[]) {
  const isSplitEnName = getPref("ennamesplit");
  for (const item of items) {
    const creators = item.getCreators();
    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      creator.fieldMode = 1;
      if (
        // English Name
        creator.lastName!.search(/[A-Za-z]/) !== -1 ||
        creator.lastName!.search(/[A-Za-z]/) !== -1
      ) {
        // 如果不拆分/合并英文名，则跳过
        if (!isSplitEnName) continue;
        creator.lastName = creator.firstName + " " + creator.lastName;
      } else {
        // For Chinese Name
        creator.lastName = creator.lastName! + creator.firstName;
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
}

export async function concatNameMenu(type: "items" | "collection") {
  const items = getItems(type);
  await concatName(items);
}

export async function splitName(items: Zotero.Item[]) {
  const isSplitEnName = getPref("ennamesplit");
  for (const item of items) {
    const creators = item.getCreators();
    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      creator.fieldMode = 0;
      if (
        // English Name
        (creator.lastName!.search(/[A-Za-z]/) >= 0 ||
          creator.firstName!.search(/[A-Za-z]/) >= 0) &&
        creator.firstName === "" // 名为空
      ) {
        // 如果不拆分/合并英文名，则跳过
        if (!isSplitEnName) continue;
        const EnglishName = creator.lastName;
        const temp = EnglishName!.split(/[\n\s+,]/g).filter(Boolean); // 过滤空字段
        creator.lastName = temp.pop()!;
        creator.firstName = temp.join(" ");
      } else if (creator.firstName === "") {
        // For Chinese Name,名为空
        const chineseName = creator.lastName || creator.firstName;
        creator.lastName = chineseName.charAt(0);
        creator.firstName = chineseName.substr(1);
      }
      creator.fieldMode = 0; // 0: two-field, 1: one-field (with empty first name)
      creators[i] = creator;
    }
    if (creators != item.getCreators()) {
      item.setCreators(creators);
      await item.saveTx();
    }
  }
}

export async function splitNameMenu(type: "items" | "collection") {
  const items = getItems(type);
  await splitName(items);
}

/**
 * 在知网搜索结果列表添加文献时，可能导致该文献的作者名变成类似于 姓名;姓名;姓名 的形式，
 * 使用此函数将分号分隔的姓名分隔到不同的条目中。
 */
export async function splitSemicolonNames(type: string) {
  const items = getItems(type);
  for (const item of items) {
    const creators = item.getCreatorsJSON();
    const newlist: Zotero.Item.CreatorJSON[] = [];
    for (const creator of creators) {
      if (creator.lastName!.search(";") && creator.firstName === "") {
        const names = creator
          .lastName!.split(";")
          .filter((s) => s !== "");
        for (const name of names) {
          newlist.push({
            firstName: "",
            lastName: name,
            creatorType: "author",
          });
        }
      } else {
        newlist.push(creator);
      }
    }
    if (newlist !== creators) {
      item.setCreators(newlist);
      await item.saveTx();
    }
  }
}

/**
 * Remove comma in filename
 */
// export async function removeComma(type: string) {
//     const items = getItems(type);
//     for (const item of items) {
//         const attachmentIDs = item.getAttachments();
//         for (const id of attachmentIDs) {
//             const atta = Zotero.Items.get(id);
//             const newName = atta.attachmentFilename.replace(
//                 /([_\u4e00-\u9fa5]),\s+([_\u4e00-\u9fa5])/g,
//                 "$1$2"
//             );
//             await atta.renameAttachmentFile(newName);
//             atta.setField("title", newName);
//             await atta.saveTx();
//         }
//     }
// }

/**
 * Set default language value in item field
 * @param {[Zotero.item]}
 * @return {void}
 */
export async function manualSetLanguage(items: Zotero.Item[]) {
  const defaultLanguage = getPref("language") as string;
  for (const item of items) {
    if (item.getField("language") != defaultLanguage) {
      item.setField("language", defaultLanguage);
      await item.saveTx();
    }
  }
}

export async function manualSetLanguageMenu(type: "items" | "collection") {
  const items = getItems(type);
  await manualSetLanguage(items);
}

// /**
//  * Batch Set language using nlp.js
//  * @param {[Zotero.item]}
//  * @return {void}
//  */
// export async function autoSetLanguage(type: string) {
//     const items = getItems(type, true);
//     // 获取常用语言列表
//     const languageStr = (
//         Zotero.Prefs.get("jasminum.languagelist") as string
//     ).replace(/\s*/g, "");
//     const languageList = languageStr.split(/,|，/g);
//     // 使用 nlp.js 进行识别
//     for (const item of items) {
//         const langGuess = guess(item.getField("title"), languageList)[0][
//             "alpha2"
//         ];
//         if (langGuess && item.getField("language") != langGuess) {
//             item.setField("language", langGuess);
//             await item.saveTx();
//         }
//     }
// }
