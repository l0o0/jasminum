import { DocTools } from "../../utils/http";

export class WanfangData implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("WanfangData search started.");
    const url = `https://s.wanfangdata.com.cn/paper?q=${encodeURIComponent(searchOption.title)}&p=1`;
    ztoolkit.log("WanfangData search URL: " + url);
    // @ts-ignore not typed
    const browser = addon.api.createHeadlessBrowser({
      allowJavaScript: true,
    });
    const extractArticleData = (node: HTMLElement): ScrapeSearchResult => {
      const dt = new DocTools(node);
      const title = dt.innerText("span.title", 0);
      const code = dt.innerText("span.title-id-hidden", 0);
      const [t, id] = code.split("_");
      const url = `https://d.wanfangdata.com.cn/${t}/${id}`;
      const infoNodes = node.querySelectorAll("div.author-area > span");
      // ztoolkit.log("Node list length", infoNodes.length);
      const infos = Array.from(infoNodes).map(
        (n) => (n as HTMLElement).innerText,
      );
      ztoolkit.log("Extracted infos: ", infos);
      const displayTitle = ` ${infos[0]} ${title} ${infos.slice(1).join(" ")}`;

      const result: ScrapeSearchResult = {
        source: "万方数据",
        title: ` ${displayTitle}`,
        url: url,
        articleTitle: title,
        type: t,
        articleID: id,
      };
      // ztoolkit.log("Extracted WanfangData search result: ", result);
      return result;
    };
    try {
      ztoolkit.log("WanfangData search: loading page");
      await browser.load(url, {
        requireSuccessfulStatus: true,
        allowInteractiveAfter: 500,
      });
      ztoolkit.log("WanfangData search: page load finished");
      const waitResult = await browser.waitForSelector(
        "div.detail-list-wrap, div.no-result",
      );
      ztoolkit.log("WanfangData search: result selector appeared");
      ztoolkit.log(waitResult);
      const doc = await browser.getDocument();
      const resultList = doc.querySelector("div.detail-list-wrap");
      if (!resultList) {
        ztoolkit.log("WanfangData search: no results found");
        return null;
      }
      const items = resultList.querySelectorAll("div.normal-list");
      ztoolkit.log(`WanfangData search: found ${items.length} items.`, items);
      const results = Array.from(items).map((item) =>
        extractArticleData(item as HTMLElement),
      );
      return results;
    } catch (error) {
      ztoolkit.log("Error during WanfangData search: ", error);
      return null;
    } finally {
      browser.destroy();
    }
  }

  async translate(
    searchResult: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<ScrapeTranslateResult> {
    ztoolkit.log("WanfangData translate started for: ", searchResult);
    const browser = addon.api.createHeadlessBrowser({
      allowJavaScript: true,
    });
    try {
      await browser.load(searchResult.url, {
        requireSuccessfulStatus: true,
      });
      await browser.waitForDocument({
        allowInteractiveAfter: 500,
      });
      const waitResult = await browser.waitForSelector("div.detailTitle");
      ztoolkit.log("WanfangData translate: detail page loaded", waitResult);
      const doc = await browser.getDocument();
      const translator = new Zotero.Translate.Web();
      translator.setTranslator("eb876bd2-644c-458e-8d05-bf54b10176f3");
      translator.setDocument(doc);
      const translatedItems = await translator.translate({
        libraryID: libraryID,
        saveAttachments: saveAttachments,
      });
      ztoolkit.log("WanfangData translate created item: ", translatedItems[0]);
      if (translatedItems.length === 0) {
        return { status: "empty", items: [] };
      }
      return { status: "success", items: translatedItems };
    } catch (error) {
      ztoolkit.log("Error during WanfangData translate: ", error);
      return {
        status: "error",
        error: `WanfangData translation failed: ${error}`,
      };
    } finally {
      browser.destroy();
    }
  }
}
