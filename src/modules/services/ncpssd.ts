import { jsonToFormUrlEncoded, requestDocument } from "../../utils/http";
import {
  buildNCPSSDSearchExpression,
  mapNCPSSDSearchResponse,
  NCPSSD_BASE_URL,
  NCPSSD_SEARCH_URL,
} from "./ncpssdCore";

export const NCPSSD_TRANSLATOR_ID = "5b731187-04a7-4256-83b4-3f042fa3eaa4";

const SEARCH_SORT = "synUpdateType|DESC,date|DESC,ik_subject|DESC,id|DESC";

interface NCPSSDWebTranslator {
  setTranslator(id: string): void;
  setDocument(document: Document): void;
  translate(options: {
    libraryID: number;
    saveAttachments: false;
  }): Promise<Zotero.Item[]>;
}

export interface NCPSSDDependencies {
  requestSearch(body: string): Promise<string>;
  loadDocument(url: string): Promise<Document>;
  createTranslator(): NCPSSDWebTranslator;
}

function createDefaultDependencies(): NCPSSDDependencies {
  return {
    async requestSearch(body) {
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
    },
    loadDocument(url) {
      return requestDocument(url, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9",
          Referer: NCPSSD_BASE_URL,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
        },
      });
    },
    createTranslator() {
      return new Zotero.Translate.Web() as NCPSSDWebTranslator;
    },
  };
}

export class NCPSSD implements ScrapeService {
  constructor(
    private readonly dependencies: NCPSSDDependencies = createDefaultDependencies(),
  ) {}

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
    const responseText = await this.dependencies.requestSearch(body);

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
      const document = await this.dependencies.loadDocument(searchResult.url);
      const translator = this.dependencies.createTranslator();
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
