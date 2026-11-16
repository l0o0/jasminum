import { requestDocument } from "../../utils/http";
import { ensureTranslator } from "../translators";

const TRANSLATOR_ID = "f306107f-dabb-41ac-8fa2-f7f858feb11f";
const BOOK_TYPES = new Set([
  "专著",
  "善本",
  "普通古籍",
  "特藏古籍",
  "计算机文件",
]);

export function wenjinBookURL(value: string): string | null {
  try {
    const url = new URL(value, "http://find.nlc.cn/");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.hostname !== "find.nlc.cn" ||
      url.pathname !== "/search/showDocDetails" ||
      !url.searchParams.get("docId")
    )
      return null;
    url.username = "";
    url.password = "";
    url.port = "";
    return url.href;
  } catch {
    return null;
  }
}

export class Wenjin implements ScrapeService {
  async search(option: SearchOption): Promise<ScrapeSearchResult[]> {
    const query = option.title;
    const url = new URL("http://find.nlc.cn/search/doSearch");
    url.searchParams.set("query", query);
    url.searchParams.set("secQuery", "");
    url.searchParams.set("actualQuery", query);
    url.searchParams.set("searchType", "2");
    url.searchParams.set("docType", "全部");
    url.searchParams.set("isGroup", "isGroup");
    url.searchParams.set("targetFieldLog", "全部字段");
    url.searchParams.set("orderBy", "RELATIVE");
    const doc = await requestDocument(url.href);
    const results = new Map<string, ScrapeSearchResult>();
    for (const node of Array.from(
      doc.querySelectorAll<HTMLAnchorElement>(
        "div.article_item div.book_name > a",
      ),
    ) as HTMLAnchorElement[]) {
      let url = wenjinBookURL(node.href);
      if (!url) {
        const detail = node
          .getAttribute("onclick")
          ?.match(
            /makeDetailUrl\(\s*this,\s*['"]\/search\/showDocDetails\?['"],\s*['"](-?\d+)['"],\s*['"]([^'"]+)['"]/,
          );
        if (detail) {
          const target = new URL("http://find.nlc.cn/search/showDocDetails");
          target.searchParams.set("docId", detail[1]);
          target.searchParams.set("dataSource", detail[2]);
          target.searchParams.set("query", query);
          url = target.href;
        }
      }
      const title = node.textContent?.trim();
      if (!url || !title) continue;
      const row = node.closest(".article_item");
      const type = row
        ?.querySelector(".book_type > .book_val")
        ?.textContent?.trim();
      if (type && !BOOK_TYPES.has(type)) continue;
      const details = [
        title,
        ...Array.from(row?.querySelectorAll(".book_type") ?? []).map((field) =>
          field?.textContent?.replace(/\s+/g, " ").trim(),
        ),
      ]
        .filter(Boolean)
        .join(" · ");
      results.set(url, {
        source: "Wenjin",
        url,
        articleTitle: title,
        title: details,
      });
      if (results.size >= 20) break;
    }
    if (!results.size && /captcha|验证|访问受限/.test(doc.title))
      throw new Error("Wenjin requires verification");
    return [...results.values()];
  }
  async translate(
    result: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<ScrapeTranslateResult> {
    try {
      const url = wenjinBookURL(result.url);
      if (!url) throw new Error("Invalid Wenjin book URL");
      const doc = await requestDocument(url);
      const type = doc
        .querySelector(".book_item:nth-child(2) span.book_val")
        ?.textContent?.trim();
      if (!type || !BOOK_TYPES.has(type)) return { status: "empty", items: [] };
      const translator = new Zotero.Translate.Web();
      translator.setTranslator(
        await ensureTranslator(TRANSLATOR_ID, "Wenjin.js"),
      );
      translator.setDocument(doc);
      const items = await translator.translate({ libraryID, saveAttachments });
      return items.length
        ? { status: "success", items }
        : { status: "empty", items: [] };
    } catch (error) {
      return { status: "error", error: `Wenjin translation failed: ${error}` };
    }
  }
}
