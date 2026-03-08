import { compareTwoStrings } from "string-similarity";
import { DocTools, requestDocument } from "../../utils/http";
const { HiddenBrowser } = ChromeUtils.importESModule(
  "chrome://zotero/content/HiddenBrowser.mjs",
);

export class Yiigle implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("Yiigle search started.");
    const url = `https://www.yiigle.com/Paper/Search?type=&q=${encodeURIComponent(searchOption.title)}&searchType=pt`;
    ztoolkit.log("Yiigle search URL: " + url);
    // @ts-ignore not typed
    const browser = new HiddenBrowser();
    const extractArticleData = (node: HTMLElement): ScrapeSearchResult => {
      const dt = new DocTools(node);
      const title = dt.attr("a[title].el-link--default", "title");

      const url = dt.attr('a[href*="rs.yiigle.com/cmaid/"]', "href");

      // 3. 提取引用量（兼容PC/移动端DOM结构）
      const citation = parseInt(dt.innerText("span > samp", 2)) || 0;

      // 4. 提取articleID（从URL末尾截取数字）
      const articleIDMatch = url.match(/\/(\d+)$/); // 匹配 /xxx 最后一段的数字
      const articleID = articleIDMatch ? articleIDMatch[1] : "";

      // 期刊类型
      const jtype = dt.innerText(
        "div.s_searchResult_li_top.el-row.el-row--flex > span.w_span.hidden-sm-and-down:not([style*='display: none'])",
        0,
      );
      // 作者等信息
      const infoText = dt
        .innerText("div.s_searchResult_li_author.el-row", 0)
        .replaceAll("\n", "");
      // 返回标准化对象
      const result: ScrapeSearchResult = {
        source: "中华医学",
        title: ` ${jtype} ${title} ${infoText}`,
        url: url,
        articleID: articleID,
        articleTitle: title,
      };
      if (citation > 0) {
        result.citation = citation;
      }
      return result;
    };
    try {
      await browser.load(url);
      await browser.waitForDocument({ allowInteractiveAfter: 5000 });
      setTimeout(() => {
        ztoolkit.log("1秒延迟到了！");
      }, 1000);
      const doc = await browser.getDocument();
      ztoolkit.log(`Yiigle search document title: ${doc.title}`);
      const items = doc.querySelectorAll("div.s_searchResult_li.el-row");
      ztoolkit.log(`Yiigle search: found ${items.length} items.`, items);
      if (items.length === 0) {
        ztoolkit.log("Yiigle search: no results found.");
        return null;
      } else {
        return Array.from(items).map((item) =>
          extractArticleData(item as HTMLElement),
        );
      }
    } catch (error) {
      ztoolkit.log("Yiigle search error: " + error);
    } finally {
      browser.destroy();
    }
    return null;
  }
  async translate(
    searchResult: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<Zotero.Item[]> {
    ztoolkit.log("Yiigle translate started.");
    const doc = await requestDocument(searchResult.url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,en-US;q=0.9,en;q=0.8",
        Referer: "https://www.yiigle.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
      },
    });
    ztoolkit.log(`Document title: ${doc.title}`);
    const translator = new Zotero.Translate.Web();
    translator.setTranslator("f5189d31-18ea-4e84-bdec-f1d0e75b818b");
    translator.setDocument(doc);
    const translatedItems = await translator.translate({
      libraryID: libraryID,
      saveAttachments: saveAttachments,
    });
    return translatedItems;
  }
}
