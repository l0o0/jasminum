const CHINA_DOI_BASE_URL = "http://www.chinadoi.cn";
const CHINA_DOI_RESOLVER_URL = "http://dx.chinadoi.cn";
const { HiddenBrowser } = ChromeUtils.importESModule(
  "chrome://zotero/content/HiddenBrowser.mjs",
);
const { RemoteTranslate } = ChromeUtils.importESModule(
  "chrome://zotero/content/RemoteTranslate.mjs",
);

function normalizeText(text?: string | null): string {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}

function getNodeText(
  node: ParentNode,
  selector: string,
  fallback = "",
): string {
  const matchedNode = node.querySelector(selector);
  return matchedNode ? normalizeText(matchedNode.textContent) : fallback;
}

function getJournalText(node: ParentNode): string {
  return getNodeText(node, ".searchDoi-info-content-list-journaltitle")
    .replace(/^\[.*?\]\s*/u, "")
    .replace(/^《|》$/gu, "")
    .trim();
}

function removePrefix(text: string, prefix: string): string {
  return normalizeText(
    text.startsWith(prefix) ? text.slice(prefix.length) : text,
  );
}

async function waitForStableURL(
  browser: typeof HiddenBrowser,
  waitMs = 500,
  maxRounds = 10,
): Promise<string> {
  let lastURL = browser.currentURI.spec;
  let stableRounds = 0;
  for (let i = 0; i < maxRounds; i++) {
    await (ztoolkit.getGlobal("Zotero") as any).Promise.delay(waitMs);
    const currentURL = browser.currentURI.spec;
    if (currentURL === lastURL) {
      stableRounds++;
      if (stableRounds >= 2) {
        return currentURL;
      }
    } else {
      lastURL = currentURL;
      stableRounds = 0;
    }
  }
  return lastURL;
}

async function resolveRedirectURL(url: string): Promise<string> {
  const browser = new HiddenBrowser({
    allowJavaScript: true,
    docShell: { allowMetaRedirects: true },
  });
  try {
    await browser.load(url, {
      requireSuccessfulStatus: true,
    });
    await browser.waitForDocument({
      allowInteractiveAfter: 500,
    });
    const resolvedURL = await waitForStableURL(browser);
    ztoolkit.log(`ChinaDOI resolved URL: ${url} -> ${resolvedURL}`);
    return resolvedURL;
  } finally {
    browser.destroy();
  }
}

function extractArticleData(node: HTMLElement): ScrapeSearchResult {
  const articleTitle = getNodeText(
    node,
    ".searchDoi-info-content-list-title-content > span",
  );
  const articleTitleEn = getNodeText(
    node,
    ".searchDoi-info-content-list-titleen > span",
  );
  const doi = getNodeText(node, ".searchDoi-info-content-list-doi");
  const infoText = getNodeText(
    node,
    ".searchDoi-info-content-list-info > .searchDoi-info-content-list-abstract",
  );
  const journal = getJournalText(node);
  const dateNodes = Array.from(
    node.querySelectorAll(
      ".searchDoi-info-content-list-info .searchDoi-info-content-list-dateyear",
    ),
  );
  const year = normalizeText(dateNodes[0]?.textContent).replace(/年$/u, "");
  const issue = normalizeText(dateNodes[1]?.textContent).replace(/期$/u, "");
  const abstract = removePrefix(
    getNodeText(node, ".searchDoi-info-content-list-container .line-clamp"),
    "简介：",
  );
  const keywords = removePrefix(
    getNodeText(
      node,
      ".searchDoi-info-content-list-container .single-line-ellipsis",
    ),
    "关键词：",
  );
  const citationText = removePrefix(
    getNodeText(node, ".searchDoi-info-content-list-articletitle"),
    "标准引文格式：",
  );

  return {
    source: "ChinaDOI",
    title: ` ${articleTitle} ${infoText}`,
    url: `${CHINA_DOI_RESOLVER_URL}/${doi}`,
    articleTitle,
    articleTitleEn: articleTitleEn || null,
    doi,
    journal: journal || null,
    year: year || null,
    issue: issue || null,
    abstract: abstract || null,
    keywords: keywords || null,
    citationText: citationText || null,
    date: year || null,
  };
}

export class ChinaDOI implements ScrapeService {
  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("ChinaDOI search started.");
    const url = `${CHINA_DOI_BASE_URL}/searchDoi?querywords=${encodeURIComponent(searchOption.title)}`;
    ztoolkit.log(`ChinaDOI search URL: ${url}`);

    // @ts-ignore not typed
    const browser = addon.api.createHeadlessBrowser({
      allowJavaScript: true,
    });

    try {
      await browser.load(url, {
        requireSuccessfulStatus: true,
        allowInteractiveAfter: 500,
      });
      await browser.waitForSelector(
        "ul.searchDoi-info-content-ul, div.searchDoi-info-count",
      );

      const doc = await browser.getDocument();
      // ztoolkit.log(`ChinaDOI search document title: ${doc.title}`);

      const resultList = doc.querySelector(
        "div.searchDoi-info-content-list > ul.searchDoi-info-content-ul",
      ) as HTMLElement | null;

      if (!resultList) {
        ztoolkit.log("ChinaDOI search: no result list found.");
        return null;
      }

      const items = resultList.querySelectorAll(
        "li.searchDoi-info-content-list-item",
      );
      ztoolkit.log(`ChinaDOI search: found ${items.length} items.`);

      if (items.length === 0) {
        return null;
      }

      return Array.from(items)
        .map((item) => extractArticleData(item as HTMLElement))
        .filter((item) => Boolean(item.articleTitle && item.doi));
    } catch (error) {
      ztoolkit.log(`ChinaDOI search error: ${error}`);
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
    let translate: typeof RemoteTranslate | null = null;
    let browser: typeof HiddenBrowser | null = null;
    try {
      const resolvedURL = await resolveRedirectURL(searchResult.url);
      browser = new HiddenBrowser({
        allowJavaScript: true,
        docShell: { allowMetaRedirects: true },
      });
      await browser.load(resolvedURL, {
        requireSuccessfulStatus: true,
      });
      await browser.waitForDocument({
        allowInteractiveAfter: 1000,
      });
      await waitForStableURL(browser);

      translate = new RemoteTranslate({ disableErrorReporting: true });
      await translate.setBrowser(browser);
      const translators = await translate.detect();
      ztoolkit.log(
        "ChinaDOI translate detected translators for resolved URL: ",
        resolvedURL,
        translators?.map(
          (translator: { label?: string; itemType?: string }) => ({
            label: translator.label,
            itemType: translator.itemType,
          }),
        ),
      );
      if (!translators?.length) {
        ztoolkit.log(
          "ChinaDOI translate: no translators found for resolved URL.",
        );
        return { status: "empty", items: [] };
      }
      translate.setTranslator(translators[0]);
      const items = await translate.translate({ libraryID, saveAttachments });
      if (!items?.length) {
        return { status: "empty", items: [] };
      }
      return { status: "success", items };
    } catch (error) {
      ztoolkit.log(`ChinaDOI translate error: ${error}`);
      return {
        status: "error",
        error: `ChinaDOI translation failed: ${error}`,
      };
    } finally {
      translate?.dispose();
      browser?.destroy();
    }
  }
}
