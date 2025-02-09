import {
  DocTools,
  jsonToFormUrlEncoded,
  requestDocument,
  text2HTMLDoc,
} from "../../utils/http";

export default class CPPINFO implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    if (searchOption.title.length == 0) return null;
    const requestHeaders = {
      Accept: "*/*",
      "Accept-Language": "zh-CN,en-US;q=0.7,en;q=0.3",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://book.cppinfo.cn",
      Referer: `https://book.cppinfo.cn/so/home/qhsearch?q=${encodeURI(searchOption.title)}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    };
    const postJson = {
      key: searchOption.title,
      author: "",
      keyword: "",
      isbn: "",
      sm: "",
      publishedClassification: "",
      offset: "1",
      sort: "",
      order: "",
      ids: "",
      minprice: "",
      maxprice: "",
      languages: "",
      cip: "",
      hasEbook: "false",
      pubyear: "",
      authorsure: "",
      publishersure: "",
      cipsearch: "",
    };
    const searchResp = await Zotero.HTTP.request(
      "POST",
      "https://book.cppinfo.cn/So/Search/Index",
      {
        headers: requestHeaders,
        body: jsonToFormUrlEncoded(postJson).replace(/%/g, "%25"),
      },
    );

    const searchDoc = text2HTMLDoc(searchResp.responseText);
    const resultDivs = searchDoc.querySelectorAll("div.pro-list");
    if (resultDivs.length == 0) {
      return null;
    } else {
      return Array.from(resultDivs).map((r) => {
        const dt = new DocTools(r as HTMLElement);
        return {
          source: "CCPINFO",
          title: dt.text("div.p-text"),
          url: dt.attr("div.p-text > a", "href"),
        };
      });
    }
  }

  async translate(
    task: ScrapeTask,
    saveAttachments: false,
  ): Promise<Zotero.Item | null> {
    const searchResult = task.searchResults![task.resultIndex!];

    const headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,en-US;q=0.7,en;q=0.3",
      Referer: `https://book.cppinfo.cn/so/home/qhsearch?q=${encodeURI(searchResult.title)}&hasEbook=false`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    };
    const doc = await requestDocument(searchResult.url, {
      headers: headers,
    });

    // Use CCPINFO translator.
    const translator = new Zotero.Translate.Web();
    translator.setTranslator("4c4b0a6c-a5e9-42ed-a742-f10f3e2ef711");
    translator.setDocument(doc);
    const translatedItems = await translator.translate({
      libraryID: task.item.libraryID,
      saveAttachments: saveAttachments,
    });

    if (translatedItems.length > 1) {
      ztoolkit.log("Wired and Additional Items Appear.");
      return null;
    } else if (translatedItems.length == 1) {
      const item = translatedItems[0];
      task.item.getCollections().forEach((cid) => item!.addToCollection(cid));
      return item;
    } else {
      ztoolkit.log("CCPINFO service translated item is null.");
      return null;
    }
  }
}
