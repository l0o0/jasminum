import { getArgsFromPattern } from "../../utils/pattern";
import { getPDFTitle } from "../../utils/pdfParser";
import { getPref } from "../../utils/prefs";
import { isChineseTopAttachment, isChinsesSnapshot } from "../menu";

export class Task implements ScrapeTask {
  public id: string;
  public item: Zotero.Item;
  public type: "attachment" | "snapshot";
  public message?: string;
  public silent?: false;

  private _status: TaskStatus;
  private _searchResults: ScrapeSearchResult[] = [];

  constructor(item: Zotero.Item, type: TaskType, silent?: false) {
    this.id = Zotero.Utilities.randomString();
    this.item = item;
    this.type = type;
    this.silent = false;
    this._status = "waiting";
  }

  // 添加消息的方法（不需要通过代理）
  addMsg(message: string) {
    if (this.message) {
      this.message = this.message + "\n" + message;
    } else {
      this.message = message;
    }
  }

  // 使用 setter 处理属性变更
  set status(newStatus: TaskStatus) {
    const oldStatus = this._status;
    this._status = newStatus;
    ztoolkit.log(
      `task ${this.id} changes "status" from "${oldStatus}" to "${newStatus}"`,
    );
    addon.data.progress.updateTaskStatus(this, newStatus);
  }
  get status(): TaskStatus {
    return this._status;
  }

  set searchResults(results: ScrapeSearchResult[]) {
    this._searchResults = results;
    ztoolkit.log("searchResult changed");
    if (results && results.length > 1) {
      addon.data.progress.updateTaskSearchResult(this, results);
    }
  }
  get searchResults() {
    return this._searchResults;
  }
}

export class Scraper {
  cnki: ScrapeService | undefined;

  constructor() {
    import("./cnki").then((e) => (this.cnki = new e.default()));
  }

  public async getSearchOption(
    item: Zotero.Item,
  ): Promise<SearchOption | null> {
    let namepattern = getPref("namepattern");
    // Get title from pdf page content.
    if (namepattern == "auto") {
      let title = undefined;
      try {
        title = await getPDFTitle(item.id);
      } catch (e) {
        ztoolkit.log(`Pdf parsing error ${e}`);
      }
      if (title) return { title };

      return getArgsFromPattern(item.attachmentFilename, "{%t}");
    } else {
      if (namepattern == "custom") namepattern = getPref("namepatternCustom");
      return getArgsFromPattern(item.attachmentFilename, namepattern);
    }
  }

  public async search(items: Zotero.Item[], options?: any): Promise<void> {
    // const scrapeServices = getPref("metadataSource").split(", ") || ["CNKI"];
    const cnItems = items.filter(
      (i) => isChineseTopAttachment(i) || isChinsesSnapshot(i),
    );
    if (cnItems.length == 0) {
      ztoolkit.log("No candidate items found. Stop search.");
      return;
    }
    for (const item of cnItems) {
      let taskType: "attachment" | "snapshot" = "attachment";
      // add more condition.
      if (isChinsesSnapshot(item)) {
        taskType = "snapshot";
      }
      const task = new Task(item, taskType);
      ztoolkit.log("search task", task);
      // TODO: Maybe this is a slient task.
      addon.data.progress.addTask(task);
      task.status = "processing";
      // Searching by different scrape services
      let scrapeSearchResults: ScrapeSearchResult[] = [];
      if (task.type == "attachment") {
        const searchOption = await this.getSearchOption(task.item);
        if (searchOption) {
          const cnkiSearchResult = await (this.cnki as ScrapeService).search(
            searchOption,
          );
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
        const tmp = await (this.cnki as ScrapeService).searchSnapshot!(task);
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
      // When there is only one search result, translate it directly.
      // User will select in progress windows and continue to translate.
      if (scrapeSearchResults.length == 1) {
        await this.translate(task);
      }
    }
  }

  // Translate into items
  public async translate(task: ScrapeTask): Promise<void> {
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
            newItem = await (this.cnki as ScrapeService).translate(task, false);
            break;
          default:
            break;
        }
        ztoolkit.log(newItem);

        if (newItem) {
          // if (addon.data.env != "development")
          if (task.type == "attachment") {
            task.item.parentID = newItem.id;
            await task.item.saveTx();
          } else if (task.type == "snapshot") {
            ztoolkit.log("Foud item, remove snapshot item");
            const tmpJSON = newItem.toJSON();
            task.item.fromJSON(tmpJSON);
            await task.item.saveTx();
          }
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
}
