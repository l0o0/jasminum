import { getArgsFromPattern } from "../../utils/pattern";
import { getPDFTitle } from "../../utils/pdfParser";
import { getPref } from "../../utils/prefs";
import { isChineseTopAttachment, isChinsesSnapshot } from "../menu";

export class Scraper {
  cnki: ScrapeService | undefined;

  constructor() {
    import("./cnki").then((e) => (this.cnki = new e.default()));
  }

  // Need to monitor the task search result change.
  private toProxyTask(task: ScrapeTask) {
    const handler = {
      set<K extends keyof ScrapeTask>(
        target: ScrapeTask,
        property: K,
        value: ScrapeTask[K],
      ): boolean {
        // 记录 status 属性的变化
        switch (property) {
          case "status":
            ztoolkit.log(
              `task ${target.id} changes "${property}" from "${target[property]}" to "${value}"`,
            );
            addon.data.progress.updateTaskStatus(target, value as string);
            break;
          case "searchResults":
            ztoolkit.log("searchResult changed");
            if (value && (value as ScrapeSearchResult[]).length > 1) {
              addon.data.progress.updateTaskSearchResult(
                target,
                value as ScrapeSearchResult[],
              );
            }
            break;
        }

        // 允许设置的属性列表
        const allowedProperties: (keyof ScrapeTask)[] = [
          "status",
          "item",
          "searchResults",
          "id",
          "errorMsg",
          "type",
          "silent",
          "resultIndex",
        ];

        // 检查属性是否允许设置
        if (allowedProperties.includes(property)) {
          target[property] = value;
          return true; // 返回 true 表示设置成功
        } else {
          // 如果属性不在允许列表中，可以抛出错误或静默忽略
          ztoolkit.log(`属性 "${property}" 不允许直接设置`);
          return false;
        }
      },
    };
    return new Proxy(task, handler);
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
      const task: ScrapeTask = {
        id: Zotero.Utilities.randomString(),
        item: item,
        type: taskType,
        status: "waiting",
      };
      const taskProxy = this.toProxyTask(task);
      ztoolkit.log("search task", taskProxy);
      // TODO: Maybe this is a slient task.
      addon.data.progress.addTask(taskProxy);
      taskProxy.status = "processing";
      // Searching by different scrape services
      let scrapeSearchResults: ScrapeSearchResult[] = [];
      if (taskProxy.type == "attachment") {
        const searchOption = await this.getSearchOption(taskProxy.item);
        if (searchOption) {
          const cnkiSearchResult = await (this.cnki as ScrapeService).search(
            searchOption,
          );
          ztoolkit.log("cnki results", cnkiSearchResult);
          if (cnkiSearchResult) {
            scrapeSearchResults = scrapeSearchResults.concat(cnkiSearchResult);
          }
        } else {
          taskProxy.errorMsg = "Filename parsing error";
          taskProxy.status = "fail";
        }
      } else if (taskProxy.type == "snapshot") {
        const tmp = await (this.cnki as ScrapeService).searchSnapshot!(
          taskProxy,
        );
        if (tmp) scrapeSearchResults = scrapeSearchResults.concat(tmp);
      }

      ztoolkit.log("all results: ", scrapeSearchResults);
      if (scrapeSearchResults.length == 0) {
        taskProxy.errorMsg = "No search results";
        taskProxy.status = "fail";
      } else if (scrapeSearchResults.length > 1) {
        taskProxy.status = "multiple_results";
      }
      taskProxy.searchResults = scrapeSearchResults;
      // When there is only one search result, translate it directly.
      // User will select in progress windows and continue to translate.
      if (scrapeSearchResults.length == 1) {
        await this.translate(taskProxy);
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
          task.errorMsg = "Translation error";
          task.status = "fail";
        }
      } catch (e) {
        task.errorMsg = `ERROR: ${e}`;
        task.status = "fail";
      }
    } else {
      task.errorMsg = "No search results found.";
      task.status = "fail";
    }
  }
}
