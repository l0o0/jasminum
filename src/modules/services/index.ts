import { getArgsFromPattern } from "../../utils/pattern";
import { getPDFTitle } from "../../utils/pdfParser";
import { getPref } from "../../utils/prefs";
import { ScraperTask } from "../../utils/task";
import { isChineseTopAttachment, isChinsesSnapshot } from "../../utils/detect";
import { CNKI } from "./cnki";
// import { PubScholar } from "./pubscholar";
import { Yiigle } from "./yiigle";
import { compareTwoStrings } from "string-similarity";
import { WanfangData } from "./wanfangdata";

const cnki = new CNKI();
// const pubscholar = new PubScholar();
const yiigle = new Yiigle();
const wanfangData = new WanfangData();

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

// Calculate similarity for search results
function calculateSimilarity(
  results: ScrapeSearchResult[],
  searchTitle: string,
): void {
  results.forEach((result) => {
    result.similarity = compareTwoStrings(
      searchTitle,
      result.articleTitle as string,
    );
  });
}

// Check if there is an exact match (similarity === 1)
function hasExactMatch(results: ScrapeSearchResult[]): boolean {
  return results.some((r) => r.similarity === 1);
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
      let hasExactMatchFound = false;
      const metadataSources = getPref("metadataSource");

      // WanFang Data (first priority)
      if (metadataSources.includes("WanFangData")) {
        const wanfangDataSearchResult = await wanfangData.search(searchOption);
        if (wanfangDataSearchResult) {
          calculateSimilarity(wanfangDataSearchResult, searchOption.title);
          task.addMsg(
            `Found ${wanfangDataSearchResult.length} results from Wanfang Data`,
          );
          scrapeSearchResults = scrapeSearchResults.concat(
            wanfangDataSearchResult,
          );
          if (hasExactMatch(wanfangDataSearchResult)) {
            task.addMsg(
              "Exact match found in Wanfang Data, skipping other services",
            );
            hasExactMatchFound = true;
          }
        }
      }

      // Yiigle 中华医学网 (second priority)
      if (!hasExactMatchFound && metadataSources.includes("Yiigle")) {
        const yiigleSearchResult = await yiigle.search(searchOption);
        ztoolkit.log("yiigle results", yiigleSearchResult);
        if (yiigleSearchResult) {
          calculateSimilarity(yiigleSearchResult, searchOption.title);
          task.addMsg(`Found ${yiigleSearchResult.length} results from Yiigle`);
          scrapeSearchResults = scrapeSearchResults.concat(yiigleSearchResult);
          if (hasExactMatch(yiigleSearchResult)) {
            task.addMsg("Exact match found in Yiigle, skipping CNKI");
            hasExactMatchFound = true;
          }
        }
      }

      // CNKI (fallback, last priority)
      if (!hasExactMatchFound && metadataSources.includes("CNKI")) {
        const cnkiSearchResult = await cnki.search(searchOption);
        ztoolkit.log("cnki results", cnkiSearchResult);
        if (cnkiSearchResult) {
          calculateSimilarity(cnkiSearchResult, searchOption.title);
          task.addMsg(`Found ${cnkiSearchResult.length} results from CNKI`);
          scrapeSearchResults = scrapeSearchResults.concat(cnkiSearchResult);
        }
      }

      // Filter search results based on pre-calculated similarity
      const filteredResults1 = scrapeSearchResults.filter((result) => {
        return (result.articleTitle as string).includes(searchOption.title);
      });

      const filteredResults2 = scrapeSearchResults.filter((result) => {
        const score = result.similarity as number;
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
        case "万方数据":
          ztoolkit.log("translated by WanfangData");
          translatedItems = await wanfangData.translate(
            searchResult,
            libraryID,
            false,
          );
          break;
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
      const translatedItem = await globalItemFix(
        task.item,
        translatedItems[0],
        task,
      );
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
// Add some extra data.
async function globalItemFix(
  oldItem: Zotero.Item,
  newItem: Zotero.Item,
  task: ScraperTask,
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

  // CNKI extra data fix
  const searchResult = task.searchResults[task.resultIndex!];
  if (searchResult.citation) {
    ztoolkit.ExtraField.setExtraField(
      newItem,
      "CNKICite",
      `${searchResult.citation}`,
    );
  }

  if (searchResult.netFirst) {
    ztoolkit.ExtraField.setExtraField(
      newItem,
      "Status",
      "advance online publication",
    );
  }

  // Remove unmatched Zotero fields note.
  if (newItem.getNotes().length > 0) {
    newItem.getNotes().forEach(async (nid) => {
      const nItem = Zotero.Items.get(nid);
      await nItem.eraseTx();
    });
  }

  if (!newItem.getField("date") && searchResult.date) {
    newItem.setField("date", searchResult.date);
  }

  return newItem;
}
