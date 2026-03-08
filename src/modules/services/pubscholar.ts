import { requestDocument } from "../../utils/http";
import { DocTools, text2HTMLDoc } from "../../utils/http";
import { ScraperTask } from "../../utils/task";

const BASE_URL = "https://pubscholar.cn";

/**
 * Parse search results from PubScholar response.
 */
function parseSearchResults(doc: Document): ScrapeSearchResult[] {
  // TODO: Update selector based on actual PubScholar page structure
  const resultRows = doc.querySelectorAll(".result-item");
  if (resultRows.length === 0) {
    ztoolkit.log("PubScholar: no items found.");
    return [];
  }
  return Array.from(resultRows).map((r) => {
    const dt = new DocTools(r as HTMLElement);
    // TODO: Update selectors to match PubScholar's HTML structure
    const title = dt.innerText(".result-title") || "";
    const url = dt.attr(".result-title a", "href") || "";
    const author = dt.innerText(".result-author") || "";
    const source = dt.innerText(".result-source") || "";
    const date = dt.innerText(".result-date") || "";
    return {
      source: "PubScholar",
      title: `${title} ${author} ${source} ${date}`,
      url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
      date: Zotero.Date.strToISO(date) || "",
    };
  });
}

/**
 * Build a Zotero item from PubScholar detail page metadata.
 */
async function createItemFromMetadata(
  metadata: Record<string, string>,
  libraryID: number,
): Promise<Zotero.Item | null> {
  // TODO: Map PubScholar metadata fields to Zotero item fields
  // Example:
  // const item = new Zotero.Item("journalArticle");
  // item.libraryID = libraryID;
  // item.setField("title", metadata.title);
  // item.setField("date", metadata.date);
  // ...
  // await item.saveTx();
  // return item;
  return null;
}

export class PubScholar implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("PubScholar search options: ", searchOption);

    let query = searchOption.title;
    if (searchOption.author) {
      query += ` ${searchOption.author}`;
    }

    // TODO: Implement PubScholar search API call
    // Step 1: Build search URL and parameters
    const searchUrl = `${BASE_URL}/api/search`;
    // Step 2: Send HTTP request
    // const resp = await Zotero.HTTP.request("POST", searchUrl, {
    //   headers: {
    //     "Content-Type": "application/json",
    //     "User-Agent": "Mozilla/5.0 ...",
    //   },
    //   body: JSON.stringify({ q: query, page: 1, pageSize: 20 }),
    //   timeout: 10000,
    // });
    // Step 3: Parse response
    // const doc = text2HTMLDoc(resp.responseText);
    // const results = parseSearchResults(doc);
    // return results.length > 0 ? results : null;

    return null;
  }

  async translate(
    searchResult: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<Zotero.Item[]> {
    ztoolkit.log(`PubScholar translate: ${searchResult.title}`);

    // TODO: Implement PubScholar translation
    // Strategy 1: Use Zotero Web Translator if a matching translator exists
    // try {
    //   const doc = await requestDocument(searchResult.url, {
    //     headers: { ... },
    //   });
    //   const translator = new Zotero.Translate.Web();
    //   translator.setTranslator("TRANSLATOR_ID");
    //   translator.setDocument(doc);
    //   const items = await translator.translate({
    //     libraryID: task.item.libraryID,
    //     saveAttachments: saveAttachments,
    //   });
    //   if (items.length === 1) return items[0];
    // } catch (e) {
    //   ztoolkit.log(`PubScholar web translation failed: ${e}`);
    // }

    // Strategy 2: Fetch metadata from detail page and build item manually
    // const metadata = await this.fetchDetailMetadata(searchResult.url);
    // return createItemFromMetadata(metadata, task.item.libraryID);

    return [];
  }
}
