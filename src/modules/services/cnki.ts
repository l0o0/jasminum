import { requestDocument } from "../../utils/http";
import { DocTools, jsonToFormUrlEncoded, text2HTMLDoc } from "../../utils/http";
import { getPref } from "../../utils/prefs";
import { ScraperTask } from "../../utils/task";

/**
 * Create post data for CNKI search.
 * @param searchOption
 * @returns
 */
function createSearchPostOptions(searchOption: SearchOption) {
  let url;
  let headers;
  // SU may find more results than TI. SU %= | TI %=
  let searchExp: string;
  if (searchOption.title.includes(" ")) {
    // 过滤掉短的主题词，可以避免出现大量无关结果
    const titleParts = searchOption.title
      .split(" ")
      .filter((i) => i.length > 4);
    searchExp =
      "(TI %= " +
      titleParts.map((_i) => `'${_i}'`).join(" % ") +
      " OR SU %= " +
      titleParts.join("+") +
      ")";
  } else {
    searchExp = `TI %= '${searchOption.title}'`;
  }
  if (searchOption.author)
    searchExp = searchExp + ` AND AU='${searchOption.author}'`;
  ztoolkit.log("Search expression: ", searchExp);
  const searchExpAside = searchExp.replace(/'/g, "&#39;");
  let queryJson;
  if (getPref("isMainlandChina")) {
    ztoolkit.log("CNKI in mainland China.");
    url = "https://kns.cnki.net/kns8s/brief/grid";
    headers = {
      Host: "kns.cnki.net",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
      Referer: "https://www.cnki.net/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,en-US;q=0.9,en;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://kns.cnki.net",
    };
    queryJson = {
      boolSearch: "true",
      QueryJson: {
        Platform: "",
        Resource: "CROSSDB",
        Classid: "WD0FTY92",
        Products: "",
        QNode: {
          QGroup: [
            {
              Key: "Subject",
              Title: "",
              Logic: 0,
              Items: [
                {
                  Key: "Expert",
                  Title: "",
                  Logic: 0,
                  Field: "EXPERT",
                  Operator: 0,
                  Value: searchExp,
                  Value2: "",
                },
              ],
              ChildItems: [],
            },
            {
              Key: "ControlGroup",
              Title: "",
              Logic: 0,
              Items: [],
              ChildItems: [],
            },
          ],
        },
        ExScope: "1",
        SearchType: 4,
        Rlang: "CHINESE",
        KuaKuCode:
          "YSTT4HG0,LSTPFY1C,JUP3MUPD,MPMFIG1A,WQ0UVIAA,BLZOG7CK,PWFIRAGL,EMRPGLPA,NLBO1Z6R,NN3FJMUV",
        SearchFrom: 1,
      },
      pageNum: "1",
      pageSize: "20",
      sortField: "",
      sortType: "",
      dstyle: "listmode",
      productStr:
        "YSTT4HG0,LSTPFY1C,RMJLXHZ3,JQIRZIYA,JUP3MUPD,1UR4K4HZ,BPBAFJ5S,R79MZMCB,MPMFIG1A,WQ0UVIAA,NB3BWEHK,XVLO76FD,HR1YT1Z9,BLZOG7CK,PWFIRAGL,EMRPGLPA,J708GVCE,ML4DRIDX,NLBO1Z6R,NN3FJMUV,",
      aside: `(${searchExpAside})`,
      searchFrom: "资源范围：总库;++中英文扩展;++时间范围：更新时间：不限;++",
      CurPage: "1",
    };
  } else {
    ztoolkit.log("Using CNKI oversea.");
    url = "https://chn.oversea.cnki.net/kns/Brief/GetGridTableHtml";
    headers = {
      Host: "chn.oversea.cnki.net",
      Referer:
        "https://chn.oversea.cnki.net/kns/AdvSearch?dbcode=CFLS&crossDbcodes=CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFN",
    };
    queryJson = {
      IsSearch: "true",
      QueryJson: {
        Platform: "",
        DBCode: "CFLS",
        KuaKuCode:
          "CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFN",
        QNode: {
          QGroup: [
            {
              Key: "Subject",
              Title: "",
              Logic: 4,
              Items: [
                {
                  Key: "Expert",
                  Title: "",
                  Logic: 0,
                  Name: "",
                  Operate: "",
                  Value: searchExp,
                  ExtendType: 12,
                  ExtendValue: "中英文对照",
                  Value2: "",
                  BlurType: "",
                },
              ],
              ChildItems: [],
            },
            {
              Key: "ControlGroup",
              Title: "",
              Logic: 1,
              Items: [],
              ChildItems: [],
            },
          ],
        },
        ExScope: 1,
        CodeLang: "",
      },
      PageName: "AdvSearch",
      DBCode: "CFLS",
      KuaKuCodes:
        "CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFN",
      CurPage: "1",
      RecordsCntPerPage: "20",
      CurDisplayMode: "listmode",
      CurrSortField: "",
      CurrSortFieldType: "desc",
      IsSentenceSearch: "false",
      Subject: "",
    };
  }
  // ztoolkit.log(queryJson);
  // ztoolkit.log(jsonToFormUrlEncoded(queryJson));
  return {
    url: url,
    data: jsonToFormUrlEncoded(queryJson),
    headers: headers,
  };
}

async function getRefworksText(
  searchResult: ScrapeSearchResult,
): Promise<string | null> {
  const headers = {
    Accept: "text/plain, */*; q=0.01",
    "Accept-Language": "zh-CN,en-US;q=0.7,en;q=0.3",
    "Content-Type": "application/x-www-form-urlencoded",
    Host: "kns.cnki.net",
    Origin: "https://kns.cnki.net",
    Priority: "u=0",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
    Referer: searchResult.url,
  };
  const isMainlandChina = getPref("isMainlandChina");
  const apiurl = isMainlandChina
    ? "https://kns.cnki.net/dm8/API/GetExport"
    : "https://kns.cnki.net/kns8/manage/APIGetExport";

  // "1": row's sequence in search result page, defualt 1; "0": index of page in search result pages, defualt 0.
  const platform = "NZKPT";
  let postData = isMainlandChina
    ? `filename=${searchResult.exportID}&uniplatform=${platform}`
    : `filename=${searchResult.dbname}!${searchResult.filename}!1!0`;
  postData += "&displaymode=GBTREFER%2Celearning%2CEndNote";
  const resp = await Zotero.HTTP.request("POST", apiurl, {
    body: postData,
    headers: headers,
    cookieSandbox: await addon.data.myCookieSandbox.getCNKIHomeCookieBox(),
  });
  ztoolkit.log(`Endnote reference text from CNKI: ${resp.responseText}`);
  const respJson = JSON.parse(resp.responseText);
  if (respJson.code != 1) {
    return null;
  } else {
    const endnoteRef = respJson.data.find(
      (i: Record<string, string>) => i.key === "EndNote",
    );
    if (endnoteRef) {
      return endnoteRef.value[0].replace(/<br>/g, "\n");
    } else {
      return null;
    }
  }
}

async function getSnapshotItem(
  item: Zotero.Item,
): Promise<Zotero.Item | undefined> {
  const regx = new RegExp(
    "/(kns8?s?|kcms2?)/(article/abstract\\?|detail/detail\\.aspx\\?)",
    "i",
  );
  if (item.itemType == "webpage" && regx.test(item.getField("url"))) {
    const attachmentItem = Zotero.Items.get(item.getAttachments()).find(
      (attachment) => {
        return (
          attachment.isSnapshotAttachment() &&
          regx.test(attachment.getField("url"))
        );
      },
    );
    if (attachmentItem === undefined) return undefined;
    const filePath = await attachmentItem.getFilePathAsync();
    if (filePath) return attachmentItem;
  }
  return undefined;
}

// Update addtional information to the item.
// Citations from CNKI, Use keyword: CNKICite
async function updateItem(
  item: Zotero.Item | null,
  searchResult: ScrapeSearchResult,
): Promise<Zotero.Item | null> {
  if (item) {
    if (searchResult.citation) {
      ztoolkit.ExtraField.setExtraField(
        item,
        "CNKICite",
        `${searchResult.citation}`,
      );
    }

    if (searchResult.netFirst) {
      ztoolkit.ExtraField.setExtraField(
        item,
        "Status",
        "advance online publication",
      );
    }

    // Remove unmatched Zotero fields note.
    if (item.getNotes().length > 0) {
      item.getNotes().forEach(async (nid) => {
        const nItem = Zotero.Items.get(nid);
        await nItem.eraseTx();
      });
    }

    if (!item.getField("date") && searchResult.date) {
      item.setField("date", searchResult.date);
    }
  }
  return item;
}

export class CNKI implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("serch options: ", searchOption);
    const postOption = createSearchPostOptions(searchOption);
    const resp = await Zotero.HTTP.request("POST", postOption.url, {
      headers: postOption.headers,
      body: postOption.data,
      cookieSandbox: await addon.data.myCookieSandbox.getCNKIHomeCookieBox(),
    });
    if (resp.status === 403) {
      ztoolkit.log(
        "CNKI access forbidden (403). This is likely due to missing or invalid cookies.",
      );
    }
    // TODO
    // Need to handle some HTTP request ERROR
    // ztoolkit.log(resp.responseText);
    const searchDoc = text2HTMLDoc(resp.responseText);
    const resultRows = searchDoc.querySelectorAll(
      "table.result-table-list > tbody > tr",
    );
    ztoolkit.log(`CNKI search result: ${resultRows.length}`);
    if (resultRows.length == 0) {
      ztoolkit.log("CNKI no items found.");
      return null;
    } else {
      const resultData = Array.from(resultRows).map((r) => {
        const dt = new DocTools(r as HTMLElement);
        let url = dt.attr("a.fz14", "href")!;
        // Missing host in CNKI oversea.
        if (!url.startsWith("http")) {
          url = "https://chn.oversea.cnki.net" + url;
        }
        const title = ` ${dt.innerText("td.seq")} ${dt.innerText("td.data")} ${dt.innerText("td.name a")} ${dt.innerText("td.author").replace(" ", ",")} ${dt.innerText("td.source")} ${dt.innerText("td.date")}`;
        return {
          source: "CNKI",
          title: title,
          url: url,
          date: Zotero.Date.strToISO(dt.innerText("td.date")) || "",
          netFirst: dt.innerText("td.name > b.marktip"),
          citation: dt.innerText("td.quote"),
          exportID: dt.attr("td.seq input", "value"),
          dbname: dt.attr("td.operat > [data-dbname]", "data-dbname"),
          filename: dt.attr("td.operat > [data-dbname]", "data-filename"),
        };
      });
      return resultData;
    }
  }

  async translate(
    task: ScraperTask,
    saveAttachments: false,
  ): Promise<Zotero.Item | null> {
    let item: Zotero.Item | null = null;
    let translatedItems: Zotero.Item[] = [];
    const searchResult = task.searchResults![task.resultIndex!];
    let isWebTranslated = true;
    try {
      const doc = await requestDocument(searchResult.url, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://kns.cnki.net/kns8s/AdvSearch",
          "Accept-Language": "zh-CN,en-US;q=0.7,en;q=0.3",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
        },
      });
      ztoolkit.log(`Document title: ${doc.title}`);
      if (doc.title != "知网节超时验证" && doc.title != "captcha") {
        // @ts-ignore - Translate is not typed.
        const translator = new Zotero.Translate.Web();
        // CNKI.js
        // If the loading of translators fails, the following code might return nothing.
        translator.setTranslator("5c95b67b-41c5-4f55-b71a-48d5d7183063");
        translator.setDocument(doc);
        translatedItems = await translator.translate({
          libraryID: task.item.libraryID,
          saveAttachments: saveAttachments,
        });
      } else {
        isWebTranslated = false;
      }
    } catch (e) {
      ztoolkit.log(`CNKI web translation failed: ${e}`);
      task.addMsg(`CNKI web translation failed: ${e}`);
      isWebTranslated = false;
    }

    // Another translation for CNKI.
    if (isWebTranslated == false) {
      try {
        ztoolkit.log("知网网页出现验证码或其他异常，准备获取其他格式文献信息");
        const refworksText = await getRefworksText(searchResult);
        if (!refworksText) {
          ztoolkit.log("CNKI reference text is null.");
          task.addMsg("CNKI reference text is null.");
          return null;
        }
        ztoolkit.log("Formated Refworks text: ", refworksText);
        const translate = new Zotero.Translate.Import();
        translate.setTranslator("7b6b135a-ed39-4d90-8e38-65516671c5bc");
        translate.setString(refworksText);
        translatedItems = await translate.translate({
          libraryID: task.item.libraryID,
          saveAttachments: false,
        });
      } catch (e) {
        ztoolkit.log(`CNKI refwork translation failed: ${e}`);
        task.addMsg(`CNKI refwork translation failed: ${e}`);
      }
    }

    if (translatedItems.length > 1) {
      ztoolkit.log("Wired and Additional Items Appear.");
      task.addMsg("Wired! More than one item after tranlsation.");
      return null;
    } else if (translatedItems.length == 1) {
      item = translatedItems[0];
      task.item.getCollections().forEach((cid) => item!.addToCollection(cid));
      return updateItem(item, searchResult);
    } else {
      ztoolkit.log("CNKI service translated item is null.");
      task.addMsg("CNKI service translated item is null.");
      return null;
    }
  }

  // CNKI webpage item or snapshot item.
  async searchSnapshot(
    task: ScraperTask,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("Start to search for snapshot");
    let webpageItem: Zotero.Item;
    let attachmentItem: Zotero.Item | undefined;
    let searchResults: ScrapeSearchResult[] | null = null;

    if (task.item.isTopLevelItem()) {
      webpageItem = task.item;
      attachmentItem = await getSnapshotItem(task.item);
    } else {
      // Snapshot item must have an valid parent item?
      webpageItem = task.item.parentItem!;
      attachmentItem = task.item;
    }
    // Find snapshot attachment,
    if (attachmentItem) {
      const filePath = (await attachmentItem.getFilePathAsync()) as string;
      // Maybe we can find some usefull data from the snapshot page.
      const doc = text2HTMLDoc(
        (await Zotero.File.getContentsAsync(filePath)) as string,
        attachmentItem.getField("url"),
      );
      const dt = new DocTools(doc);
      // http://x.cnki.net/search/common/testlunbo?dbcode=CJFQ&tablename=CJFDAUTO&filename=ZWBH202405039&filesourcetype=1
      const noteUrl = dt.attr("li[title='记笔记'].btn-note > a", "href");
      // https://aiplus.cnki.net/aiplus/direct?cid=Pe2nFq1PBOM11SpCErZ-LwM1UHjV0uMR_icN4IXwgidjURR2ddM6CTa9OS-R4yps7kfD7g5Wa4sKEufH3KeS74nDa1x0Roidi_RcpyaNH-4!&mimetype=XML
      const aiUrl = dt.attr("li.btn-cnki-ai > a", "href");
      const noteParams = new URLSearchParams(noteUrl.split("?")[1]);
      const aiParams = new URLSearchParams(aiUrl.split("?")[1]);
      searchResults = [
        {
          source: "CNKI",
          title: attachmentItem.getField("title"),
          url: attachmentItem.getField("url"),
          dbcode: noteParams.get("dbcode"),
          dbname: noteParams.get("tablename"),
          filename: noteParams.get("filename"),
          exportID: aiParams.get("cid"),
        },
      ];
      ztoolkit.log("Found searchResult in snapshot page", searchResults[0]);
    }

    // Found nothing in the snapshot page. Use CNKI search.
    if (searchResults === null) {
      const searchOption: SearchOption = {
        title: webpageItem.getField("title").replace(/ - 中国知网$/g, ""),
      };
      searchResults = await this.search(searchOption);
      ztoolkit.log("Found searchResult from CNKI search", searchResults);
    }
    return searchResults || null;
  }
}
