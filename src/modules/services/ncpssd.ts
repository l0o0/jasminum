import { jsonToFormUrlEncoded, requestDocument } from "../../utils/http";

export const NCPSSD_SOURCE = "NCPSSD";
export const NCPSSD_BASE_URL = "https://www.ncpssd.cn";
export const NCPSSD_SEARCH_URL = `${NCPSSD_BASE_URL}/searchHandler/search`;
export const NCPSSD_TRANSLATOR_ID = "5b731187-04a7-4256-83b4-3f042fa3eaa4";

const CHINESE_JOURNAL_ARTICLE = "中文期刊文章";
const SEARCH_SORT = "synUpdateType|DESC,date|DESC,ik_subject|DESC,id|DESC";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeSearchValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? `${value}`.trim()
    : "";
}

function getPages(row: Record<string, unknown>): string {
  const begin = stringValue(row.beginpage);
  const end = stringValue(row.endpage);
  if (begin && end && begin !== end) return `${begin}-${end}`;
  return begin || end;
}

export function buildNCPSSDSearchExpression(title: string): string | null {
  const normalizedTitle = normalizeWhitespace(title);
  if (!normalizedTitle) return null;
  const escapedTitle = escapeSearchValue(normalizedTitle);
  return `(IKTE="${escapedTitle}" OR IKPYTE="${escapedTitle}" OR IKET="${escapedTitle}") AND TYPE="${CHINESE_JOURNAL_ARTICLE}"`;
}

export function buildNCPSSDArticleURL(articleID: string): string {
  return (
    `${NCPSSD_BASE_URL}/Literature/articleinfo` +
    `?id=${encodeURIComponent(articleID)}` +
    "&type=journalArticle" +
    `&typename=${encodeURIComponent(CHINESE_JOURNAL_ARTICLE)}` +
    "&nav=0&barcodenum="
  );
}

export function mapNCPSSDSearchResponse(
  response: unknown,
): ScrapeSearchResult[] {
  const envelope = asRecord(response);
  if (!envelope || envelope.result !== true || envelope.code !== 200) return [];

  const data = asRecord(envelope.data);
  if (!data || !Array.isArray(data.rows)) return [];

  const seen = new Set<string>();
  const results: ScrapeSearchResult[] = [];

  for (const value of data.rows) {
    const row = asRecord(value);
    if (!row || stringValue(row.type) !== CHINESE_JOURNAL_ARTICLE) continue;

    const articleID = stringValue(row.data_id) || stringValue(row.id);
    const articleTitle = stringValue(row.title);
    if (!articleID || !articleTitle || seen.has(articleID)) continue;
    seen.add(articleID);

    const author = stringValue(row.creator);
    const journal = stringValue(row.cbw_name);
    const date = stringValue(row.date) || stringValue(row.years);
    const year = stringValue(row.years);
    const displayTitle = [articleTitle, author, journal, year]
      .filter(Boolean)
      .join(" ");

    results.push({
      source: NCPSSD_SOURCE,
      title: displayTitle,
      url: buildNCPSSDArticleURL(articleID),
      articleID,
      articleTitle,
      author,
      date,
    });
  }

  return results;
}

async function requestNCPSSDSearch(body: string): Promise<string> {
  const response = await Zotero.HTTP.request("POST", NCPSSD_SEARCH_URL, {
    body,
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: NCPSSD_BASE_URL,
      Referer: `${NCPSSD_BASE_URL}/Literature/articlelist`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
      "X-Requested-With": "XMLHttpRequest",
    },
    successCodes: [200],
    timeout: 10000,
  });
  return response.responseText;
}

function loadNCPSSDDocument(url: string): Promise<Document> {
  return requestDocument(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Referer: NCPSSD_BASE_URL,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
    },
  });
}

export class NCPSSD implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    const expression = buildNCPSSDSearchExpression(searchOption.title);
    if (!expression) return null;

    const body = jsonToFormUrlEncoded({
      search: expression,
      pageNum: 1,
      pageSize: 20,
      sort: SEARCH_SORT,
      sType: 0,
      ajaxKeys: searchOption.title.trim(),
      customShowCondition: `题名="${searchOption.title.trim()}"`,
    });
    const responseText = await requestNCPSSDSearch(body);

    let response: unknown;
    try {
      response = JSON.parse(responseText);
    } catch (error) {
      ztoolkit.log(`NCPSSD returned a non-JSON search response: ${error}`);
      return null;
    }

    const results = mapNCPSSDSearchResponse(response);
    return results.length ? results : null;
  }

  async translate(
    searchResult: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<ScrapeTranslateResult> {
    try {
      const document = await loadNCPSSDDocument(searchResult.url);
      const translator = new Zotero.Translate.Web();
      translator.setTranslator(NCPSSD_TRANSLATOR_ID);
      translator.setDocument(document);
      const items = await translator.translate({ libraryID, saveAttachments });

      if (items.length === 0) return { status: "empty", items: [] };

      const doi =
        typeof searchResult.doi === "string" ? searchResult.doi.trim() : "";
      if (doi) {
        for (const item of items) {
          if (!item.getField("DOI").trim()) item.setField("DOI", doi);
        }
      }

      return { status: "success", items };
    } catch (error) {
      ztoolkit.log(`NCPSSD translation failed: ${error}`);
      return {
        status: "error",
        error: `NCPSSD translation failed: ${error}`,
      };
    }
  }
}
