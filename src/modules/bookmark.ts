import { config } from "../../package.json";
import { getHTMLDoc } from "../utils/http";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { showPop } from "../utils/window";
import { searchCNKI } from "./cnki";

async function checkPDFtkPath() {
  const pdftkpath = getPref("pdftkpath") as string;
  let pdftk = "";
  if (Zotero.isWin) {
    pdftk = OS.Path.join(pdftkpath, "pdftk.exe");
  } else {
    pdftk = OS.Path.join(pdftkpath, "pdftk");
  }
  ztoolkit.log(pdftk);
  const fileExist = await OS.File.exists(pdftk);
  return fileExist;
}

async function getCNKIReaderUrl(itemUrl: string) {
  ztoolkit.log("parsing chapter page");
  const htmldoc = await getHTMLDoc(itemUrl);
  const nodes = Zotero.Utilities.xpath(
    htmldoc,
    "//a[@id='cajDown' and (contains(text(), '章节下载') or contains(text(), '分章下载'))]"
  );
  if (nodes.length == 0) {  // No results
    return '';
  }
  const href = nodes[0].getAttribute("href")!;
  
  ztoolkit.log(nodes.length);
  ztoolkit.log(href);
  if (href.startsWith("..")) {
    // New CNKI url
    ztoolkit.log("new");
    return "https://kns.cnki.net/kcms2" + href.replace(/^\.\./, "");
  } else {
    ztoolkit.log("old");
    return "https://kns.cnki.net" + href;
  }
}

async function getChapterText(
  chapterUrl: string,
  item: Zotero.Item
): Promise<any> {
  ztoolkit.log(`chapter Url: ${chapterUrl}`);
  const key = item.key;
  const lib = item.libraryID;
  const chapterHTML = await getHTMLDoc(chapterUrl);
  const rows = chapterHTML.querySelectorAll(
    "div.main-content > div.list-main > ul.ls-chapters > li"
  );
  ztoolkit.log(rows.length);
  const rows_array = [];
  let note = "";
  for (const row of rows) {
    ztoolkit.log(row.textContent!.trim());
    const level =
      parseInt(row.getAttribute("class")?.split("-")[1] as string) + 1; // Source level from 0
    const title = (row.querySelector("p.txt") as HTMLElement).innerText.trim();
    const pageRange = (
      row.querySelector("span.page") as HTMLElement
    ).innerText.split("-");
    const page = pageRange[0];
    const bookmark = `BookmarkBegin\nBookmarkTitle: ${title}\nBookmarkLevel: ${level}\nBookmarkPageNumber: ${page}`;
    rows_array.push(bookmark);
    note += `<li style="padding-top: ${level == 1 ? 4 : 8}px; padding-left: ${
      12 * (level - 1)
    }px"><a href="zotero://open-pdf/${lib}_${key}/${page}">${title}</a></li>\n`;
  }
  const d = new Date();
  note =
    `<p id="title"><strong>Contents[${d.toLocaleString()}]</strong></p>\n` +
    '<ul id="toc" style="list-style-type: none; padding-left: 0px">\n' +
    note +
    "</ul>";
  return { bookmark: rows_array.join("\n"), note: note };
}


async function addBookmark(item: Zotero.Item, bookmark: string) {
  Zotero.debug("** Jasminum add bookmark begin");
  // Zotero.debug(item);
  let cacheFile = Zotero.getTempDirectory();
  let cachePDF = Zotero.getTempDirectory();
  // PDFtk will throw errors when args contains Chinese character
  // So create a tmp folder.
  if (Zotero.isWin) {
    const newTmp = OS.Path.join(cacheFile.path.slice(0, 3), "tmp");
    Zotero.debug("** Jasminum new tmp path " + newTmp);
    cacheFile = Zotero.getTempDirectory();
    cachePDF = Zotero.getTempDirectory();
    cacheFile.initWithPath(newTmp);
    cachePDF.initWithPath(newTmp);
    if (!cacheFile.exists()) {
      cacheFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 777);
    }
  }
  cacheFile.append("bookmark.txt");
  if (cacheFile.exists()) {
    cacheFile.remove(false);
  }

  cachePDF.append("output.pdf");
  if (cachePDF.exists()) {
    cachePDF.remove(false);
  }

  const encoder = new TextEncoder();
  const array = encoder.encode(bookmark);
  await OS.File.writeAtomic(cacheFile.path, array, {
    tmpPath: cacheFile.path + ".tmp",
  });
  let pdftk = getPref("pdftkpath") as string;
  if (Zotero.isWin) {
    pdftk = OS.Path.join(pdftk, "pdftk.exe");
  } else {
    pdftk = OS.Path.join(pdftk, "pdftk");
  }
  Zotero.debug("** Jasminum pdftk path: " + pdftk);
  const args: string[] = [
    item.getFilePath() as string,
    "update_info_utf8",
    cacheFile.path,
    "output",
    cachePDF.path,
  ];
  Zotero.debug(
    "PDFtk: Running " +
      pdftk +
      " " +
      args.map((arg) => "'" + arg + "'").join(" ")
  );
  try {
    await Zotero.Utilities.Internal.exec(pdftk, args);
    await OS.File.copy(cachePDF.path, item.getFilePath() as string);
    cacheFile.remove(false);
    cachePDF.remove(false);
    showPop(getString("addbookmark-success", {args: {filename: item.attachmentFilename}}));
  } catch (e: any) {
    // try {
    //   cacheFile.remove(false);
    //   cachePDF.remove(false);
    // } catch (e: Error) {
    //   Zotero.logError(e);
    // }
    showPop(getString("addbookmark-fail", {args: {filename: item.attachmentFilename}}), "fail");
  }
}

export async function addBookmarkItem(item?: Zotero.Item) {
  if (item === undefined) {
    item = ZoteroPane.getSelectedItems()[0];
  }
  if (!(await checkPDFtkPath())) {
    showPop(getString("pdftk-missing"), "fail");
    return;
  }
  // Show alert when file is missing
  const attachmentExists =
    item.getFilePath() && (await OS.File.exists(item.getFilePath() as string));
  if (!attachmentExists) {
    showPop(getString("pdf-missing"), "fail");
    return;
  }
  
  const parentItem = item.parentItem!;
  let parentItemUrl = parentItem.getField("url") as string;
  let chapterUrl = "";
  if ((!parentItemUrl) || (!parentItemUrl.startsWith("https://kns.cnki.net"))) {
    Zotero.debug("Jasminum search for item url");
    const fileData = {
      keyword: parentItem.getField("title"),
      author:
        parentItem.getCreator(0).lastName! + parentItem.getCreator(0).firstName,
    };
    const targetRows = await searchCNKI(fileData);
    ztoolkit.log(targetRows[0].url);
    if (targetRows.length === 0) {
      return null;
    }
    // Frist row in search table is selected.
    parentItemUrl = targetRows[0].url;
    parentItem.setField("url", parentItemUrl);
    await parentItem.saveTx();
    // 获取文献链接URL -> 获取章节目录URL
  }
  chapterUrl = await getCNKIReaderUrl(parentItemUrl);
  ztoolkit.log("item url: " + parentItemUrl);
  ztoolkit.log("item chapter url: " + chapterUrl);

  if (chapterUrl == '') {
    showPop(getString("bookmark-missing"), "fail");
    return ;
  }
  
  const bookmarkOut = await getChapterText(chapterUrl, item);
  if (!bookmarkOut.bookmark) {
    showPop(getString("bookmark-missing"), "fail");
    return;
  } else {
    // Add TOC note
    let noteHTML = item.getNote();
    noteHTML = bookmarkOut.note + noteHTML;
    item.setNote(noteHTML);
    await item.saveTx();
    await addBookmark(item, bookmarkOut.bookmark);
  }
}
