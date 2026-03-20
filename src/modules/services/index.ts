import { getArgsFromPattern } from "../../utils/pattern";
import { getPDFTitle } from "../../utils/pdfParser";
import { getPref } from "../../utils/prefs";
import { ScraperTask } from "../../utils/task";
import { isChineseTopAttachment, isChinsesSnapshot } from "../../utils/detect";
import { CNKI } from "./cnki";
// import { PubScholar } from "./pubscholar";
import { Yiigle } from "./yiigle";
import { compareTwoStrings } from "string-similarity";

const cnki = new CNKI();
// const pubscholar = new PubScholar();
const yiigle = new Yiigle();

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
    task.addMsg(
      `Region: ${getPref("isMainlandChina") ? "Mainland China" : "Overseas"}`,
    );
    task.addMsg(`Search pattern: ${getPref("namePattern")}`);
    task.addMsg(`Search option: ${JSON.stringify(searchOption)}`);
    if (searchOption) {
      const cnkiSearchResult = await cnki.search(searchOption);
      ztoolkit.log("cnki results", cnkiSearchResult);
      if (cnkiSearchResult) {
        task.addMsg(`Found ${cnkiSearchResult.length} results from CNKI`);
        scrapeSearchResults = scrapeSearchResults.concat(cnkiSearchResult);
      }
      // const pubscholarSearchResult = await pubscholar.search(searchOption);
      // ztoolkit.log("pubscholar results", pubscholarSearchResult);
      // if (pubscholarSearchResult) {
      //   task.addMsg(
      //     `Found ${pubscholarSearchResult.length} results from PubScholar`,
      //   );
      //   scrapeSearchResults = scrapeSearchResults.concat(
      //     pubscholarSearchResult,
      //   );
      // }
      const yiigleSearchResult = await yiigle.search(searchOption);
      ztoolkit.log("yiigle results", yiigleSearchResult);
      if (yiigleSearchResult) {
        task.addMsg(`Found ${yiigleSearchResult.length} results from Yiigle`);
        scrapeSearchResults = scrapeSearchResults.concat(yiigleSearchResult);
      }

      // Filter search results
      const filteredResults1 = scrapeSearchResults.filter((result) => {
        return (result.articleTitle as string).includes(searchOption.title);
      });

      const filteredResults2 = scrapeSearchResults.filter((result) => {
        const score = compareTwoStrings(
          searchOption.title,
          result.articleTitle as string,
        );
        ztoolkit.log(`Similarity score for "${result.articleTitle}": ${score}`);
        return (
          !(result.articleTitle as string).includes(searchOption.title) &&
          score > parseFloat(getPref("similarityThresholdForMetaData"))
        );
      });
      scrapeSearchResults = filteredResults1.concat(filteredResults2);
      task.addMsg(
        `After filtering, ${scrapeSearchResults.length} results left.`,
      );
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
  if (task.searchResults.length === 0) {
    task.addMsg("No search results found.");
    task.status = "fail";
  }

  try {
    const resultIndex = task.resultIndex || 0; // default is 0
    task.resultIndex = resultIndex;
    const searchResult = task.searchResults[resultIndex];
    const libraryID = task.item.libraryID;
    ztoolkit.log(`start translate for search result: ${searchResult.title}`);
    let translatedItems: Zotero.Item[] = [];
    try {
      switch (searchResult.source) {
        case "CNKI":
          ztoolkit.log("translated by CNKI");
          translatedItems = await cnki.translate(
            searchResult,
            libraryID,
            false,
          );
          break;
        // case "PubScholar":
        //   ztoolkit.log("translated by PubScholar");
        //   newItem = await pubscholar.translate(task, false);
        //   break;
        case "中华医学":
          ztoolkit.log("translated by Yiigle");
          translatedItems = await yiigle.translate(
            searchResult,
            libraryID,
            false,
          );
          break;
        default:
          break;
      }
      ztoolkit.log(translatedItems);
    } catch (e) {
      ztoolkit.log(`Translation error: ${e}`);
      task.addMsg(`Translation error: ${e}`);
    }

    if (translatedItems.length === 1) {
      // if (addon.data.env != "development")
      const translatedItem = await globalItemFix(task.item, translatedItems[0]);
      if (task.type == "attachment") {
        task.item.parentID = translatedItem.id;
      } else if (task.type == "snapshot") {
        if (task.item.isTopLevelItem()) {
          ztoolkit.log("Translate snapshot item for webpage item");
          const tmpJSON = translatedItem.toJSON();
          task.item.fromJSON(tmpJSON);
          await translatedItem.eraseTx();
        } else {
          ztoolkit.log("Translate snapshot attachment item");
          const oldParentItem = task.item.parentItem!;
          const collectionIDs = oldParentItem.getCollections();
          task.item.parentID = translatedItem.id;
          // When parent item is erased, the attachment item will be erased. Set new parent item before the old parent will be earsed.
          await task.item.saveTx();
          await oldParentItem.eraseTx();
          translatedItem.setCollections(collectionIDs);
          await translatedItem.saveTx();
        }
      }
      await task.item.saveTx();
      task.status = "success";
    } else if (translatedItems.length > 1) {
      task.addMsg(
        `Multiple items (${translatedItems.length}) translated, please check details.`,
      );
      task.status = "fail";
    } else {
      task.addMsg("Translation error");
      task.status = "fail";
    }
  } catch (e) {
    task.addMsg(`ERROR: ${e}`);
    task.status = "fail";
  }
}

// Need to update data in item returned by translator.
async function globalItemFix(
  oldItem: Zotero.Item,
  newItem: Zotero.Item,
): Promise<Zotero.Item> {
  if (Zotero.Prefs.get("extensions.zotero.automaticTags", true)) {
    // Keyword tag type is automatic.
    ztoolkit.log("update auto tags");
    newItem.setTags(
      newItem.getTags().map((t: { tag: string; type?: number }) => ({
        tag: t.tag,
        type: 1,
      })),
    );
  } else {
    // Remove automatic tags
    ztoolkit.log("remove all tags");
    newItem.removeAllTags();
  }
  // Preserve collections
  oldItem.getCollections().forEach((cid) => newItem!.addToCollection(cid));
  await newItem.saveTx();
  return newItem;
}
