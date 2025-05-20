import { getArgsFromPattern } from "../../utils/pattern";
import { getPDFTitle } from "../../utils/pdfParser";
import { getPref } from "../../utils/prefs";
import { ScraperTask } from "../../utils/task";
import { isChineseTopAttachment, isChinsesSnapshot } from "../../utils/detect";
import { CNKI } from "./cnki";

const cnki = new CNKI();
async function getSearchOption(
  item: Zotero.Item,
): Promise<SearchOption | null> {
  let namepattern = getPref("namePattern");
  // Get title from pdf page content.
  // 1: title from PDF, 2: {%t}_{%g}
  if (namepattern == "auto") {
    let title = undefined;
    try {
      title = await getPDFTitle(item.id);
    } catch (e) {
      ztoolkit.log(`Pdf parsing error ${e}`);
    }
    if (title) return { title };

    return getArgsFromPattern(item.attachmentFilename, "{%t}_{%g}");
  } else {
    if (namepattern == "custom") namepattern = getPref("namePatternCustom");
    return getArgsFromPattern(item.attachmentFilename, namepattern);
  }
}

export async function metaSearch(
  task: ScraperTask,
  options?: any,
): Promise<void> {
  // const scrapeServices = getPref("metadataSource").split(", ") || ["CNKI"];
  if (!isChineseTopAttachment(task.item) && !isChinsesSnapshot(task.item)) {
    ztoolkit.log("No Chinese attachment or snapshot items found. Stop search.");
    return;
  }

  ztoolkit.log("search task", task);
  task.status = "processing";
  // Searching by different scrape services
  let scrapeSearchResults: ScrapeSearchResult[] = [];
  if (task.type == "attachment") {
    const searchOption = await getSearchOption(task.item);
    if (searchOption) {
      const cnkiSearchResult = await cnki.search(searchOption);
      ztoolkit.log("cnki results", cnkiSearchResult);
      if (cnkiSearchResult) {
        task.addMsg(`Found ${cnkiSearchResult.length} results from CNKI`);
        scrapeSearchResults = scrapeSearchResults.concat(cnkiSearchResult);
      }
    } else {
      task.addMsg("Filename parsing error");
      task.status = "fail";
    }
  } else if (task.type == "snapshot") {
    const tmp = await cnki.searchSnapshot!(task);
    if (tmp) scrapeSearchResults = scrapeSearchResults.concat(tmp);
  }

  ztoolkit.log("all results: ", scrapeSearchResults);
  if (scrapeSearchResults.length == 0) {
    task.addMsg("No search results");
    task.status = "fail";
  } else if (scrapeSearchResults.length > 1) {
    task.status = "multiple_results";
  }
  task.searchResults = scrapeSearchResults;
}

export async function metaTranslate(task: ScraperTask): Promise<void> {
  if (task.searchResults) {
    try {
      const resultIndex = task.resultIndex || 0; // default is 0
      task.resultIndex = resultIndex;
      const result = task.searchResults[resultIndex];
      ztoolkit.log(`start translate for search result: ${result.title}`);
      let newItem: Zotero.Item | null | undefined = null;
      switch (result.source) {
        case "CNKI":
          ztoolkit.log("translated by CNKI");
          newItem = await cnki.translate(task, false);
          break;
        default:
          break;
      }
      ztoolkit.log(newItem);

      if (newItem) {
        // if (addon.data.env != "development")
        newItem = await globalItemFix(newItem);
        if (task.type == "attachment") {
          task.item.parentID = newItem.id;
        } else if (task.type == "snapshot") {
          if (task.item.isTopLevelItem()) {
            ztoolkit.log("Translate snapshot item for webpage item");
            const tmpJSON = newItem.toJSON();
            task.item.fromJSON(tmpJSON);
            await newItem.eraseTx();
          } else {
            ztoolkit.log("Translate snapshot attachment item");
            const oldParentItem = task.item.parentItem!;
            const collectionIDs = oldParentItem.getCollections();
            task.item.parentID = newItem.id;
            // When parent item is erased, the attachment item will be erased. Set new parent item before the old parent will be earsed.
            await task.item.saveTx();
            await oldParentItem.eraseTx();
            newItem.setCollections(collectionIDs);
            await newItem.saveTx();
          }
        }
        await task.item.saveTx();
        task.status = "success";
      } else {
        task.addMsg("Translation error");
        task.status = "fail";
      }
    } catch (e) {
      task.addMsg(`ERROR: ${e}`);
      task.status = "fail";
    }
  } else {
    task.addMsg("No search results found.");
    task.status = "fail";
  }
}

// Need to update data in item returned by translator.
async function globalItemFix(item: Zotero.Item): Promise<Zotero.Item> {
  if (Zotero.Prefs.get("extensions.zotero.automaticTags", true)) {
    // Keyword tag type is automatic.
    ztoolkit.log("update auto tags");
    item.setTags(
      item.getTags().map((t: { tag: string; type?: number }) => ({
        tag: t.tag,
        type: 1,
      })),
    );
  } else {
    // Remove automatic tags
    ztoolkit.log("remove all tags");
    item.removeAllTags();
  }
  await item.saveTx();
  return item;
}
// export class Scraper {
//   cnki: ScrapeService | undefined;

//   constructor() {
//     import("./cnki").then((e) => (this.cnki = new e.default()));
//   }

//   public async getSearchOption(
//     item: Zotero.Item,
//   ): Promise<SearchOption | null> {
//     let namepattern = getPref("namePattern");
//     // Get title from pdf page content.
//     // 1: title from PDF, 2: {%t}_{%g}
//     if (namepattern == "auto") {
//       let title = undefined;
//       try {
//         title = await getPDFTitle(item.id);
//       } catch (e) {
//         ztoolkit.log(`Pdf parsing error ${e}`);
//       }
//       if (title) return { title };

//       return getArgsFromPattern(item.attachmentFilename, "{%t}_{%g}");
//     } else {
//       if (namepattern == "custom") namepattern = getPref("namePatternCustom");
//       return getArgsFromPattern(item.attachmentFilename, namepattern);
//     }
//   }

//   public async search(items: Zotero.Item[], options?: any): Promise<void> {
//     // const scrapeServices = getPref("metadataSource").split(", ") || ["CNKI"];
//     const cnItems = items.filter(
//       (i) => isChineseTopAttachment(i) || isChinsesSnapshot(i),
//     );
//     if (cnItems.length == 0) {
//       ztoolkit.log("No candidate items found. Stop search.");
//       return;
//     }
//     for (const item of cnItems) {
//       let taskType: "attachment" | "snapshot" = "attachment";
//       // add more condition.
//       if (isChinsesSnapshot(item)) {
//         taskType = "snapshot";
//       }
//       const task = new ScraperTask(item, taskType);
//       ztoolkit.log("search task", task);
//       // TODO: Maybe this is a slient task.
//       const returnTaskID = await addon.data.progress.addTask(task);
//       if (!returnTaskID) {
//         ztoolkit.log("Trying to add task again. Stop here.");
//         continue;
//       }
//       task.status = "processing";
//       // Searching by different scrape services
//       let scrapeSearchResults: ScrapeSearchResult[] = [];
//       if (task.type == "attachment") {
//         const searchOption = await this.getSearchOption(task.item);
//         if (searchOption) {
//           const cnkiSearchResult = await (this.cnki as ScrapeService).search(
//             searchOption,
//           );
//           ztoolkit.log("cnki results", cnkiSearchResult);
//           if (cnkiSearchResult) {
//             task.addMsg(`Found ${cnkiSearchResult.length} results from CNKI`);
//             scrapeSearchResults = scrapeSearchResults.concat(cnkiSearchResult);
//           }
//         } else {
//           task.addMsg("Filename parsing error");
//           task.status = "fail";
//         }
//       } else if (task.type == "snapshot") {
//         const tmp = await (this.cnki as ScrapeService).searchSnapshot!(task);
//         if (tmp) scrapeSearchResults = scrapeSearchResults.concat(tmp);
//       }

//       ztoolkit.log("all results: ", scrapeSearchResults);
//       if (scrapeSearchResults.length == 0) {
//         task.addMsg("No search results");
//         task.status = "fail";
//       } else if (scrapeSearchResults.length > 1) {
//         task.status = "multiple_results";
//       }
//       task.searchResults = scrapeSearchResults;
//       // When there is only one search result, translate it directly.
//       // User will select in progress windows and continue to translate.
//       if (scrapeSearchResults.length == 1) {
//         await this.translate(task);
//       }
//     }
//   }

//   // Translate into items
//   public async translate(task: ScraperTask): Promise<void> {
//     if (task.searchResults) {
//       try {
//         const resultIndex = task.resultIndex || 0; // default is 0
//         task.resultIndex = resultIndex;
//         const result = task.searchResults[resultIndex];
//         ztoolkit.log(`start translate for search result: ${result.title}`);
//         let newItem: Zotero.Item | null | undefined = null;
//         switch (result.source) {
//           case "CNKI":
//             ztoolkit.log("translated by CNKI");
//             newItem = await (this.cnki as ScrapeService).translate(task, false);
//             break;
//           default:
//             break;
//         }
//         ztoolkit.log(newItem);

//         if (newItem) {
//           // if (addon.data.env != "development")
//           newItem = await this.globalItemFix(newItem);
//           if (task.type == "attachment") {
//             task.item.parentID = newItem.id;
//           } else if (task.type == "snapshot") {
//             if (task.item.isTopLevelItem()) {
//               ztoolkit.log("Translate snapshot item for webpage item");
//               const tmpJSON = newItem.toJSON();
//               task.item.fromJSON(tmpJSON);
//               await newItem.eraseTx();
//             } else {
//               ztoolkit.log("Translate snapshot attachment item");
//               const oldParentItem = task.item.parentItem!;
//               const collectionIDs = oldParentItem.getCollections();
//               task.item.parentID = newItem.id;
//               // When parent item is erased, the attachment item will be erased. Set new parent item before the old parent will be earsed.
//               await task.item.saveTx();
//               await oldParentItem.eraseTx();
//               newItem.setCollections(collectionIDs);
//               await newItem.saveTx();
//             }
//           }
//           await task.item.saveTx();
//           task.status = "success";
//         } else {
//           task.addMsg("Translation error");
//           task.status = "fail";
//         }
//       } catch (e) {
//         task.addMsg(`ERROR: ${e}`);
//         task.status = "fail";
//       }
//     } else {
//       task.addMsg("No search results found.");
//       task.status = "fail";
//     }
//   }

//   // Need to update data in item returned by translator.
//   async globalItemFix(item: Zotero.Item): Promise<Zotero.Item> {
//     if (Zotero.Prefs.get("extensions.zotero.automaticTags", true)) {
//       // Keyword tag type is automatic.
//       ztoolkit.log("update auto tags");
//       item.setTags(
//         item.getTags().map((t: { tag: string; type?: number }) => ({
//           tag: t.tag,
//           type: 1,
//         })),
//       );
//     } else {
//       // Remove automatic tags
//       ztoolkit.log("remove all tags");
//       item.removeAllTags();
//     }
//     await item.saveTx();
//     return item;
//   }
// }
