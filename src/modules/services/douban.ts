import { requestDocument } from "../../utils/http";
import { ensureTranslator } from "../translators";

const TRANSLATOR_ID = "fc353b26-8911-4c34-9196-f6f567c93901";

export function doubanBookURL(value: string): string | null {
  try {
    let url = new URL(value, "https://www.douban.com/");
    if (url.hostname === "www.douban.com" && url.pathname === "/link2/")
      url = new URL(
        url.searchParams.get("url") ?? "",
        "https://www.douban.com/",
      );
    if (
      url.hostname !== "book.douban.com" ||
      !/^\/subject\/\d+\/?$/.test(url.pathname)
    )
      return null;
    return `https://book.douban.com${url.pathname.replace(/\/?$/, "/")}`;
  } catch {
    return null;
  }
}

export class Douban implements ScrapeService {
  async search(option: SearchOption): Promise<ScrapeSearchResult[]> {
    const doc = await requestDocument(
      `https://www.douban.com/search?cat=1001&q=${encodeURIComponent(option.title)}`,
    );
    const results = new Map<string, ScrapeSearchResult>();
    for (const node of Array.from(
      doc.querySelectorAll<HTMLAnchorElement>(".result .title h3 a"),
    ) as HTMLAnchorElement[]) {
      const url = doubanBookURL(node.href);
      const title = node.textContent?.trim();
      if (!url || !title) continue;
      const info = node
        .closest(".result")
        ?.querySelector(".subject-cast")
        ?.textContent?.trim();
      results.set(url, {
        source: "Douban",
        url,
        articleTitle: title,
        title: info ? `${title} · ${info}` : title,
      });
      if (results.size >= 20) break;
    }
    if (
      !results.size &&
      /captcha|sec\.douban\.com|验证|异常请求/i.test(
        doc.location.href + doc.title,
      )
    )
      throw new Error(
        "Douban requires verification. Open douban.com in Zotero and try again.",
      );
    return [...results.values()];
  }
  async translate(
    result: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<ScrapeTranslateResult> {
    try {
      const url = doubanBookURL(result.url);
      ztoolkit.log(`Translating Douban book: ${url} (libraryID: ${libraryID})`);
      if (!url) throw new Error("Invalid Douban book URL");
      const doc = await requestDocument(url);
      if (
        !doubanBookURL(doc.location.href) ||
        !doc.querySelector("h1")?.textContent?.trim()
      )
        throw new Error("Douban did not return a book page");
      const translator = new Zotero.Translate.Web();
      translator.setTranslator(
        await ensureTranslator(
          TRANSLATOR_ID,
          "Douban.js",
          "2024-11-15 03:16:28",
        ),
      );
      translator.setDocument(doc);
      const items = await translator.translate({ libraryID, saveAttachments });
      return items.length
        ? { status: "success", items }
        : { status: "empty", items: [] };
    } catch (error) {
      return { status: "error", error: `Douban translation failed: ${error}` };
    }
  }
}
