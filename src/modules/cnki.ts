import { config } from "../../package.json";
import { getHTMLDoc, getHTMLText, string2HTML } from "../utils/http";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { getItems, isCNKIPDF } from "../utils/tools";
import { showPop } from "../utils/window";
import { addBookmarkItem } from "./bookmark";

export function getIDFromURL(url: string): CNKIID | boolean {
  if (!url) return false;
  // add regex for navi.cnki.net
  const dbname = url.match(/[?&](?:db|table)[nN]ame=([^&#]*)/i);
  const filename = url.match(/[?&]filename=([^&#]*)/i);
  const dbcode = url.match(/[?&]dbcode=([^&#]*)/i);
  if (
    !dbname ||
    !dbname[1] ||
    !filename ||
    !filename[1] ||
    !dbcode ||
    !dbcode[1]
  )
    return false;
  return { dbname: dbname[1], filename: filename[1], dbcode: dbcode[1] };
}

export function getIDFromSearchRow(row: Element): CNKIID | boolean {
  const input = row.querySelector("td.seq input");
  const values = input?.getAttribute("value")?.split("!");
  const dbname = input?.getAttribute("tb");
  if (!values || values.length != 3) return false;
  const dbcode = values[0];
  const filename = values[1];

  if (!dbname || !filename || !dbcode) return false;

  return { dbname: dbname, filename: filename, dbcode: dbcode };
}

/**
 * Sometimes CNKI URL contains a temporary dbname,
 * you need to find a valid dbname from page.
 * @param {HTMLDocument}
 * @return {Object} {dbname: ..., filename: ..., dbcode: ...}
 */
export function getIDFromPage(page: Document): CNKIID | boolean {
  Zotero.debug(page.title);
  if (page.title == "知网节超时验证") {
    Zotero.debug("** Jasminum 知网节超时验证");
    return false;
  }
  const dbcode = page
    .querySelector("input#paramdbcode")!
    .getAttribute("value") as string;
  const filename = page
    .querySelector("input#paramfilename")!
    .getAttribute("value") as string;
  const dbname = page
    .querySelector("input#paramdbname")!
    .getAttribute("value") as string;
  Zotero.debug(`${dbname}, ${dbcode}, ${filename}`);
  return { dbname: dbname, filename: filename, dbcode: dbcode };
}

/**
 * Get CNKI article id
 * @param {String} url CNKI url string
 * @return {Object} article id
 */
export async function getCNKIID(
  url: string,
  fromPage = false,
): Promise<CNKIID | boolean> {
  if (!fromPage && getIDFromURL(url)) {
    return getIDFromURL(url);
  } else {
    const htmlDocument = await getHTMLDoc(url);
    return getIDFromPage(htmlDocument);
  }
}

/**
 * Create post data for CNKI reference output.
 * @param ids
 * @returns
 */
function createRefPostData(id: CNKIID) {
  // filename=CPFDLAST2020!ZGXD202011001016!1!14%2CCPFDLAST2020!ZKBD202011001034!2!14&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542
  // New multiple: FileName=CAPJ!XDTQ20231110001!1!0%2Ckd9kqNkOM8Xyu_MccKCQ5AM1UHjV0uMR_icN4IXwgicZ_CtYnuxduewAwhD5Qh2GSo4NZ_c4MLfuFbIiSMX1OrzIQ1G0iNFSWKuVwMIdPIM!%2Ckd9kqNkOM8Xyu_MccKCQ5AM1UHjV0uMR_icN4IXwgiecAKpOFogNWlYApDrbdtLwkhlBN69wm54APwSt_M517LzIQ1G0iNFSWKuVwMIdPIM!&DisplayMode=Refworks&OrderParam=0&OrderType=desc&SelectField=&PageIndex=1&PageSize=20&language=CHS&uniplatform=NZKPT&random=0.9986425284493061
  // New single: FileName=CCNDTEMP!ZJSB20231108A060!1!0&DisplayMode=Refworks&OrderParam=0&OrderType=desc&SelectField=&PageIndex=1&PageSize=20&language=&uniplatform=NZKPT&random=0.30585230060685187
  return `FileName=${id.dbname}!${id.filename}!1!0&DisplayMode=Refworks&OrderParam=0&OrderType=desc&SelectField=&PageIndex=1&PageSize=20&language=&uniplatform=NZKPT&random=0.30585230060685187`;
}

/**
 * Create post data for CNKI search.
 * @param fileData
 * @returns
 */
function createSearchPostData(fileData: any) {
  const queryJson: any = {
    Platform: "",
    Resource: "CROSSDB",
    DBCode: "SCDB",
    KuaKuCode: "CJZK,CDFD,CMFD,CPFD,IPFD,CCND,BDZK,CPVD",
    QNode: {
      QGroup: [
        {
          Key: "Subject",
          Title: "",
          Logic: 0,
          Items: [],
          ChildItems: [], // fill up here
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
    SearchType: "0",
  };
  if (fileData.author) {
    const au = {
      Key: "",
      Title: "",
      Logic: 0,
      Items: [
        {
          Key: "",
          Title: "作者",
          Logic: 0,
          Field: "AU",
          Operator: "DEFAULT",
          Value: fileData.author,
          Value2: "",
        },
      ],
      ChildItems: [],
    };

    queryJson.QNode.QGroup[0].ChildItems.push(au);
  }
  // 必要标题，不然搜个啥。标题全按主题词搜索，虽然模糊，可是适用范围大
  // 所谓模糊搜索就是将特殊符号去掉，所以字段放到主题词中
  // TODO: 新增模糊搜索选项
  const su = {
    Key: "",
    Title: "",
    Logic: 0,
    Items: [
      {
        Key: "",
        Title: "主题",
        Logic: 0,
        Field: "SU",
        Operator: "TOPRANK",
        Value: fileData.keyword,
        Value2: "",
      },
    ],
    ChildItems: [],
  };
  queryJson.QNode.QGroup[0].ChildItems.push(su);
  ztoolkit.log(queryJson);
  const tailing =
    "&DbCode=SCDB&pageNum=1&pageSize=20&sortField=PT&sortType=desc&boolSearch=true&boolSortSearch=false&version=kns7&CurDisplayMode=listmode&productStr=CJZK,CDFD,CMFD,CPFD,IPFD,CCND,BDZK,CPVD&sentenceSearch=false&aside=空";
  return encodeURI(`QueryJson=${JSON.stringify(queryJson)}` + tailing);
}

export function splitFilename(filename: string) {
  // Make query parameters from filename
  // const patent = Zotero.Prefs.get("jasminum.namepatent") as string;
  const patent = "{%t}_{%g}";
  const prefix = filename
    .replace(/\.\w+$/, "") // 删除文件后缀
    .replace(/\.ashx$/g, "") // 删除末尾.ashx字符
    .replace(/^_|_$/g, "") // 删除前后的下划线
    .replace(/[（(]\d+[）)]$/, ""); // 删除重复下载时文件名出现的数字编号 (1) （1）
  // 当文件名模板为"{%t}_{%g}"，文件名无下划线_时，将文件名认定为标题
  if (patent === "{%t}_{%g}" && !prefix.includes("_")) {
    return {
      author: "",
      keyword: prefix,
    };
  }
  const patentSepArr: string[] = patent.split(/{%[^}]+}/);
  const patentSepRegArr: string[] = patentSepArr.map((x) =>
    x.replace(/([[\\^$.|?*+()])/g, "\\$&"),
  );
  const patentMainArr: string[] | null = patent.match(/{%[^}]+}/g);
  //文件名中的作者姓名字段里不能包含下划线，请使用“&,，”等字符分隔多个作者，或仅使用第一个作者名（加不加“等”都行）。
  const patentMainRegArr = patentMainArr!.map((x) =>
    x.replace(
      /.+/,
      /{%y}/.test(x) ? "(\\d+)" : /{%g}/.test(x) ? "([^_]+)" : "(.+)",
    ),
  );
  const regStrInterArr = patentSepRegArr.map((_, i) => [
    patentSepRegArr[i],
    patentMainRegArr[i],
  ]);
  const patentReg = new RegExp(
    // eslint-disable-next-line prefer-spread
    [].concat
      .apply([], regStrInterArr as never)
      .filter(Boolean)
      .join(""),
    "g",
  );

  const prefixMainArr = patentReg.exec(prefix);
  // 文件名识别结果为空，跳出警告弹窗
  if (prefixMainArr === null) {
    showPop(
      getString("filename-parse-fail", {
        args: { filename: filename, patent: patent },
      }),
      "fail",
    );
    return;
  }
  const titleIdx = patentMainArr!.indexOf("{%t}");
  const authorIdx = patentMainArr!.indexOf("{%g}");
  const titleRaw = titleIdx != -1 ? prefixMainArr[titleIdx + 1] : "";
  const authors = authorIdx != -1 ? prefixMainArr[authorIdx + 1] : "";
  const authorArr = authors.split(/[,，&]/);
  let author = authorArr[0];
  if (authorArr.length == 1) {
    //删除名字后可能出现的“等”字，此处未能做到识别该字是否属于作者姓名。
    //这种处理方式的问题：假如作者名最后一个字为“等”，例如：“刘等”，此时会造成误删。
    //于是对字符数进行判断，保证删除“等”后，至少还剩两个字符，尽可能地避免误删。

    author =
      author.endsWith("等") && author.length > 2
        ? author.substring(0, author.length - 1)
        : author;
  }

  //为了避免文件名中的标题字段里存在如下两种情况而导致的搜索失败:
  //原标题过长，文件名出现“_省略_”；
  //原标题有特殊符号（如希腊字母、上下标）导致的标题变动，此时标题也会出现“_”。
  //于是只取用标题中用“_”分割之后的最长的部分作为用于搜索的标题。

  //这种处理方式的问题：假如“最长的部分”中存在知网改写的部分，也可能搜索失败。
  //不过这只是理论上可能存在的情形，目前还未实际遇到。

  let title: string;
  // Zotero.debug(titleRaw);
  // if (/_/.test(titleRaw)) {

  //     //getLongestText函数，用于拿到字符串数组中的最长字符
  //     //摘自https://stackoverflow.com/a/59935726
  //     const getLongestText = (arr) => arr.reduce(
  //         (savedText, text) => (text.length > savedText.length ? text : savedText),
  //         '',
  //     );
  //     title = getLongestText(titleRaw.split(/_/));
  // } else {
  //     title = titleRaw;
  // }

  // 去除_省略_ "...", 多余的 _ 换为空格
  // 标题中含有空格，查询时会启用模糊模式
  title = titleRaw.replace("_省略_", " ").replace("...", " ");
  title = title.replace(/_/g, " ");
  return {
    author: author,
    keyword: title,
  };
}

/**
 * Select the right result row.
 * Use item.title or string as display title, index as key.
 */
export function selectCNKIRows(targetRows: CNKIRow[]) {
  if (targetRows.length == 1) {
    ztoolkit.log("Pass select window only 1 result");
    return targetRows;
  }
  const rowSelectors = targetRows.reduce((p: any, c, i: number) => {
    p[i] = c.title;
    return p;
  }, {});
  ztoolkit.log("select window start");
  const io = { dataIn: rowSelectors, dataOut: null };
  window.openDialog(
    "chrome://zotero/content/ingester/selectitems.xhtml",
    "",
    "chrome,modal,centerscreen,resizable=yes",
    io,
  );
  const resultRows: CNKIRow[] = [];
  const targetIndicator = io.dataOut;
  ztoolkit.log("select window end");
  // Zotero.debug(targetIndicator);
  // No item selected, return null
  if (!targetIndicator) return resultRows;
  Object.keys(targetIndicator).forEach(function (i) {
    resultRows.push(targetRows[parseInt(i)]);
  });
  return resultRows;
}

/**
 * Url in cnki search page is missing host name.
 * @param url
 * @returns
 */
function fixCNKIUrl(url: string): string {
  const host = "https://kns.cnki.net";
  if (!url.startsWith(host)) {
    return host + url;
  } else {
    return url;
  }
}

/**
 * Search CNKI by PDF filename and author name, and get selected articles
 * @param fileData
 */
export async function searchCNKI(fileData: any): Promise<CNKIRow[]> {
  ztoolkit.log(`Begain to search CNKI ${fileData.keyword} ${fileData.author}`);
  const postData = createSearchPostData(fileData);
  ztoolkit.log(postData);
  // const postData = `QueryJson=%7B%22Platform%22%3A%22%22%2C%22Resource%22%3A%22CROSSDB%22%2C%22DBCode%22%3A%22SCDB%22%2C%22KuaKuCode%22%3A%22CJZK%2CCJFN%2CCDFD%2CCMFD%2CCPFD%2CIPFD%2CCCND%2CBDZK%2CCISD%2CSNAD%2CCCJD%2CCPVD%22%2C%22QNode%22%3A%7B%22QGroup%22%3A%5B%7B%22Key%22%3A%22Subject%22%2C%22Title%22%3A%22%22%2C%22Logic%22%3A0%2C%22Items%22%3A%5B%7B%22Field%22%3A%22SU%22%2C%22Value%22%3A%22%E5%9F%BA%E6%9C%AC%E5%8E%9F%E7%90%86%22%2C%22Operator%22%3A0%2C%22Logic%22%3A0%7D%5D%2C%22ChildItems%22%3A%5B%5D%7D%5D%7D%2C%22ExScope%22%3A1%2C%22SearchType%22%3A%220%22%7D&DbCode=SCDB&pageNum=1&pageSize=20&sortType=desc&boolSearch=true&version=kns7&productStr=CJZK%2CCJFN%2CCDFD%2CCMFD%2CCPFD%2CIPFD%2CCCND%2CBDZK%2CCISD%2CSNAD%2CCCJD%2CCPVD&sentenceSearch=false&aside=%E4%B8%BB%E9%A2%98%3A%E5%9F%BA%E6%9C%AC%E5%8E%9F%E7%90%86`;
  const requestHeaders = {
    Host: "kns.cnki.net",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    Accept: "text/html, */*; q=0.01",
    "Accept-Language": "zh-CN,en-US;q=0.7,en;q=0.3",
    "Accept-Encoding": "gzip, deflate, br",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Length": postData.length,
    Origin: "https://kns.cnki.net",
    Connection: "keep-alive",
    Referer: `https://kns.cnki.net/kns/search?dbcode=SCDB&kw=${encodeURI(
      fileData.title,
    )}&korder=SU&crossdbcodes=CJFQ,CDFD,CMFD,CPFD,IPFD,CCND,CISD,SNAD,BDZK,CCJD,CJRF,CJFN`,
  };
  const postUrl = "https://kns.cnki.net/kns/brief/grid";
  // Zotero.debug(Zotero.Jasminum.CookieSandbox);
  const resp = await Zotero.HTTP.request("POST", postUrl, {
    headers: requestHeaders,
    body: postData,
  });
  // Zotero.debug(resp.responseText);
  ztoolkit.log(`CNKI search return status code : ${resp.status}`);
  // targetRows
  const html = string2HTML(resp.responseText);
  const rows = html.querySelectorAll("table.result-table-list > tbody > tr");
  ztoolkit.log(`CNKI results: ${rows.length}`);
  const targetRows: CNKIRow[] = [];
  if (rows.length == 0) {
    ztoolkit.log("**Jasminum No items found.");
    return targetRows;
  } else {
    ztoolkit.log("** found results");
    for (let idx = 0; idx < rows.length; idx++) {
      // ztoolkit.log(rows[idx].innerHTML);
      const rowText = rows[idx].textContent!.split(/\s+/).join(" ");
      let href = rows[idx].querySelector("a.fz14")!.getAttribute("href")!;
      href = fixCNKIUrl(href);
      const citation = (
        rows[idx].querySelector("td.quote")! as HTMLElement
      ).innerText!.trim();
      const id = (getIDFromURL(href) ||
        getIDFromSearchRow(rows[idx])) as CNKIID;
      targetRows.push({
        url: href,
        id: id,
        title: rowText,
        citation: citation,
      });
      ztoolkit.log(rowText);
    }
  }
  const resusltRows = selectCNKIRows(targetRows);
  return resusltRows;
}

// Get refwork text data from search target rows
export async function getRefworksText(targetID: CNKIID): Promise<string> {
  // let targetIDs: CNKIID[] = resultRows.reduce((p:CNKIID[], c) => {p.push(c.id); return p}, []);
  const postData = createRefPostData(targetID);
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Host: "kns.cnki.net",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    Accept: "text/plain, */*; q=0.01",
    "Accept-Language": "zh-CN,en-US;q=0.7,en;q=0.3",
    "Accept-Encoding": "gzip, deflate, br",
    "Content-Length": postData.length,
    Origin: "https://kns.cnki.net",
    Connection: "keep-alive",
    Referer: `https://kns.cnki.net/dm/manage/export.html?filename=${targetID.dbname}!${targetID.filename}!1!0&displaymode=NEW&uniplatform=NZKPT`,
  };
  Zotero.debug(postData);
  const url = "https://kns.cnki.net/dm/api/ShowExport";
  const resp = await Zotero.HTTP.request("POST", url, {
    body: postData,
    headers: headers,
  });
  return resp.responseText
    .replace("<ul class='literature-list'><li>", "")
    .replace("<br></li></ul>", "")
    .replace("</li><li>", "") // divide results
    .replace(/<br>|\r/g, "\n")
    .replace(/vo (\d+)\n/, "VO $1\n") // Divide VO and IS to different line
    .replace(/IS 0(\d+)\n/g, "IS $1\n") // Remove leading 0
    .replace(/VO 0(\d+)\n/g, "VO $1\n")
    .replace(/\n+/g, "\n")
    .replace(/\n([A-Z][A-Z1-9]\s)/g, "<br>$1")
    .replace(/\n/g, "")
    .replace(/<br>/g, "\n")
    .replace(/\t/g, "") // \t in abstract
    .replace(/^RT\s+Conference Proceeding/gim, "RT Conference Proceedings")
    .replace(/^RT\s+Dissertation\/Thesis/gim, "RT Dissertation")
    .replace(
      /^(A[1-4]|U2)\s*([^\r\n]+)/gm,
      function (m: any, tag: any, authors: any) {
        authors = authors.split(/\s*[;，,]\s*/); // that's a special comma
        if (!authors[authors.length - 1].trim()) authors.pop();
        return tag + " " + authors.join("\n" + tag + " ");
      },
    )
    .trim();
}

/**
 * User Refworks translator translate refwors data into item.
 * @param data refworks text data
 * @param libraryID
 * @returns
 */
export async function trans2Items(data: string, libraryID: number) {
  const translate = new Zotero.Translate.Import();
  translate.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86");
  translate.setString(data);
  Zotero.debug("** Jasminum translate begin ...");
  const newItems = await translate.translate({
    libraryID: libraryID,
    saveAttachments: false,
  });
  if (newItems.length) {
    ztoolkit.log(
      `** Jasminum translate end,  ${newItems.length} item translated`,
    );
    return newItems;
  } else {
    showPop(getString("reference-trans-fail"), "fail");
  }
}

/**
 * Add extra data to item and update some fields
 * @param newItems
 * @param targetData
 * @returns
 */
export async function fixItem(newItems: Zotero.Item[], targetData: any) {
  ztoolkit.log("start to fix cnki item");
  let creators: MyCreator[];
  // 学位论文Thesis，导师 -> contributor
  for (let idx = 0; idx < newItems.length; idx++) {
    const newItem = newItems[idx];
    if (newItem.getNotes()) {
      if (Zotero.ItemTypes.getName(newItem.itemTypeID) == "thesis") {
        creators = newItem.getCreators() as MyCreator[];
        const note = Zotero.Items.get(newItem.getNotes()[0])
          .getNote()
          .split(/<br\s?\/>/);
        // Zotero.debug(note);
        for (const line of note) {
          if (line.startsWith("A3")) {
            const creator: MyCreator = {
              firstName: "",
              lastName: line.replace("A3 ", ""),
              creatorType: "contributor",
              fieldMode: 1,
            };
            creators.push(creator);
          }
        }
        newItem.setCreators(creators);
      }
      Zotero.Items.erase(newItem.getNotes());
    }
    // 是否处理中文姓名. For Chinese name
    if (getPref("zhnamesplit")) {
      creators = newItem.getCreators() as MyCreator[];
      for (let i = 0; i < creators.length; i++) {
        const creator = creators[i];
        creator.fieldMode = 0;
        if (creator.firstName) continue;

        const lastSpace = creator.lastName.lastIndexOf(" ");
        if (creator.lastName.search(/[A-Za-z]/) !== -1 && lastSpace !== -1) {
          // western name. split on last space
          creator.firstName = creator.lastName.substring(0, lastSpace);
          creator.lastName = creator.lastName.substring(lastSpace + 1);
        } else {
          // Chinese name. first character is last name, the rest are first name
          creator.firstName = creator.lastName.substring(1);
          creator.lastName = creator.lastName.charAt(0);
        }
        creators[i] = creator;
      }
      newItem.setCreators(creators);
    }
    // Clean up abstract
    if (newItem.getField("abstractNote")) {
      newItem.setField(
        "abstractNote",
        (newItem.getField("abstractNote") as string)
          .replace(/\s*[\r\n]\s*/g, "\n")
          .replace(/&lt;.*?&gt;/g, ""),
      );
    }
    // Parse page content.
    let extraString = "";
    const html = await getHTMLDoc(targetData["targetUrls"][idx]);
    // Full abstract note.
    if ((newItem.getField("abstractNote") as string).endsWith("...")) {
      const abs = html.querySelector("#ChDivSummary") as HTMLElement;
      if (abs.innerText) {
        newItem.setField("abstractNote", abs.innerText.trim());
      }
    }
    // Add DOI
    // @ts-ignore namespace 是可选参数
    const doi = Zotero.Utilities.xpath(
      html,
      "//*[contains(text(), 'DOI')]/following-sibling::p",
    );
    if ("DOI" in newItem && doi != null) {
      // Some items lack DOI field
      newItem.setField("DOI", doi![0].getAttribute("innerText")!);
    }

    // Remove wront CN field.
    newItem.setField("callNumber", "");
    if (Zotero.ItemTypes.getName(newItem.itemTypeID) != "patent") {
      newItem.setField("libraryCatalog", "CNKI");
    }
    newItem.setField("url", targetData["targetUrls"][idx]);
    if (targetData.citations[idx]) {
      // Add citation
      const dateString = new Date().toLocaleDateString().replace(/\//g, "-");
      const citationString = `${targetData.citations[idx]} citations(CNKI)[${dateString}]`;
      extraString = citationString;
    }

    // Add Article publisher type, surrounded by <>. 核心期刊
    // @ts-ignore namespace 是可选参数
    const publisherType = Zotero.Utilities.xpath(
      html,
      "//div[@class='top-tip']//a[@class='type']",
    );
    if (publisherType != null) {
      extraString =
        extraString +
        "<" +
        Array.from(publisherType)
          .map((ele) => (ele as HTMLElement).innerText)
          .join(", ") +
        ">";
    }

    newItem.setField("extra", extraString);

    // Keep tags according global config.
    // This is a Zotero pref
    if (Zotero.Prefs.get("automaticTags") === false) {
      newItem.setTags([]);
    }
    // Change tag type
    const tags = newItem.getTags();
    // Zotero.debug('** Jasminum tags length: ' + tags.length);
    if (tags.length > 0) {
      const newTags = [];
      for (const tag of tags) {
        tag.type = 1;
        newTags.push(tag);
      }
      newItem.setTags(newTags);
    }
    newItems[idx] = newItem;
  }
  ztoolkit.log("end to fix cnki item");
  return newItems;
}

export async function searchCNKIMetadata(items: Zotero.Item[]) {
  if (items.length == 0) return;
  for (const item of items) {
    const itemCollections = item.getCollections();
    const libraryID = item.libraryID;
    // Retrive meta data for webpage item OR you can use title to search
    if (Zotero.ItemTypes.getName(item.itemTypeID) === "webpage") {
      Zotero.debug("** Jasminum add webpage.");
      const articleId = (await getCNKIID(
        item.getField("url") as string,
      )) as CNKIID;
      Zotero.debug([articleId]);
      const data = await getRefworksText(articleId);
      // Zotero.debug("** Jasminum webpage data");

      let newItems = await trans2Items(data, libraryID);
      const targetData = {
        targetUrls: [item.getField("url") as string],
        citations: [""],
      };
      newItems = await fixItem(newItems, targetData);
      // Keep the same collection in newItem.
      if (itemCollections.length) {
        for (const collectionID of itemCollections) {
          for (const i of newItems) {
            i.addToCollection(collectionID);
            await i.saveTx();
          }
        }
      }
      // Move notes and attachments to newItems
      const childIDs = item.getNotes().concat(item.getAttachments());
      if (childIDs.length > 0) {
        for (const childID of childIDs) {
          const childItem = Zotero.Items.get(childID);
          childItem.parentID = newItems[0].id;
          await childItem.saveTx();
        }
      }

      // Move item to Trash
      item.deleted = true;
      await item.saveTx();
    } else {
      const fileData = splitFilename(item.attachmentFilename);
      ztoolkit.log(fileData);
      const targetRows = await searchCNKI(fileData);
      ztoolkit.log(targetRows);
      // 有查询结果返回
      if (targetRows.length > 0) {
        // const ids = targetRows.map((r) => r.id);
        const id = targetRows[0].id;
        const targetData = targetRows.reduce(
          (p: any, c) => {
            p.targetUrls.push(c.url);
            p.citations.push(c.citation);
            return p;
          },
          { targetUrls: [], citations: [] },
        );
        const data = await getRefworksText(id);
        let newItems = await trans2Items(data, libraryID);
        newItems = await fixItem(newItems, targetData);
        Zotero.debug("** Jasminum DB trans ...");
        if (itemCollections.length) {
          for (const collectionID of itemCollections) {
            newItems.forEach((i: Zotero.Item) =>
              item.addToCollection(collectionID),
            );
          }
        }
        // 只有单个返回结果
        if (newItems.length == 1) {
          const newItem = newItems[0];
          // Put old item as a child of the new item
          item.parentID = newItem.id;
          // Use Zotfile to rename file
          if (getPref("rename") && typeof Zotero.ZotFile != "undefined") {
            Zotero.ZotFile.renameSelectedAttachments();
          }

          await item.saveTx();
          await newItem.saveTx();
          // Add bookmark after PDF attaching to new item
          if (getPref("autobookmark") && isCNKIPDF(item)) {
            await addBookmarkItem(item);
          }
        } else {
          // 有多个返回结果，将文件与新条目关联，用于用户后续手动选择
          newItems.forEach((i: Zotero.Item) => item.addRelatedItem(i));
          await item.saveTx();
        }
        showPop(getString("cnkimetadata-success"));
        ztoolkit.log("search CNKI metadata finished");
      } else {
        // 没有查询结果
        showPop(
          getString("cnkimetadata-fail", {
            args: { author: fileData!.author, title: fileData!.keyword },
          }),
          "fail",
        );
      }
    }
  }
}

export async function searchCNKIMetadataMenu(type: "items" | "collection") {
  const items = getItems(type);
  await searchCNKIMetadata(items);
}

function getCitationFromPage(html: Document) {
  const citenode = html.querySelector("input#paramcitingtimes");
  return citenode ? citenode.getAttribute("value") : null;
}

function getCSSCI(html: Document) {
  const cssci = html.querySelectorAll("a.type");
  return cssci.length > 0
    ? Array.prototype.map.call(cssci, (ele) => ele.innerText).join(", ")
    : null;
}

/**
 * Update citation in Zotero item field
 * 110 citations(CNKI)[2021-08-22]<北大核心, CSCI>
 * @param {[Zotero.item]}
 * @return {void}
 */
export async function updateCiteCSSCI() {
  let html;
  const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
  for (const item of items) {
    ztoolkit.log("CSSSI");
    if (
      ["patent", "webpage"].includes(Zotero.ItemTypes.getName(item.itemTypeID))
    ) {
      showPop(
        getString("unmatched-itemtype-fail", {
          args: { itemType: Zotero.ItemTypes.getName(item.itemTypeID) },
        }),
        "fail",
      );
      continue;
    } else if (
      (item.getField("title") as string).search(/[_\u4e00-\u9fa5]/) === -1
    ) {
      showPop(getString("nonchinese-item"), "fail");
      continue;
    } else if (item.getField("url")) {
      ztoolkit.log(item.getField("url"));
      let url = item.getField("url") as string;
      html = await getHTMLDoc(url);
      // 检测是否出现知网验证页面,一般网页以nxgp开头的页面，会出现知网验证页面
      if (html.querySelector("div.verify_wrap")) {
        showPop(getString("cnki-capatch-warning"), "fail");
        continue;
      }
      // 特异性网址，
      // @ts-ignore namespace 是可选参数
      const warnnode = Zotero.Utilities.xpath(html, "//h2[@id='erro_span']");
      if (warnnode.length > 0) {
        Zotero.debug("** Jasminum 条目网址有点特殊");
        const fileData = {
          keyword: item.getField("title"),
          author:
            item.getCreators()[0].lastName! + item.getCreators()[0].firstName,
        };
        const targetRows = await searchCNKI(fileData);
        if (targetRows && targetRows.length > 0) {
          const cnkiid = getIDFromURL(targetRows[0].url) as CNKIID;
          const urls = await getRefworksText(cnkiid);
          Zotero.debug("** Jasminum " + urls[0]);
          // item.setField('url', urls[0]);
          // item.saveTx();
          url = item.getField("url") as string;
          html = await getHTMLDoc(url);
          // 检测是否出现知网验证页面,一般网页以nxgp开头的页面，会出现知网验证页面
          if (html.querySelector("div.verify_wrap")) {
            showPop(getString("cnki-capatch-warning"), "fail");
            continue;
          }
        }
      }
      const cite = getCitationFromPage(html);
      // let citeString = `CNKI citations: ${cite}[${dateString}]`;
      const cssci = getCSSCI(html);
      if (cite != null && parseInt(cite) > 0) {
        await ztoolkit.ExtraField.setExtraField(item, "CNKICite", cite);
      }
      if (cssci) {
        // 或者可以参考其他核心期刊数据来源
        await ztoolkit.ExtraField.setExtraField(item, "CSSCI", cssci);
      }
      showPop(
        getString("cssci-success", {
          args: {
            title: item.getField("title"),
            cite: cite ? cite : "",
            cssci: cssci ? cssci : "",
          },
        }),
      );
      ztoolkit.log("cite number: ${cite} cssci: ${cssci}");
    } else {
      showPop(getString("url-missing"), "fail");
    }
  }
}
