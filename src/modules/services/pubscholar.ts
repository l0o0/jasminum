// =============================================================
// PubScholar 公益学术平台 抓取服务
//
// 本文件分为两部分：
//   1. 纯函数工具区（无 Zotero 运行时依赖）：API 签名、查询构建、
//      RIS 生成、字段映射等逻辑。将来搭建测试系统时，可将此区域
//      整体抽出为独立模块直接进行单测。
//   2. PubScholar 服务实现：负责与 Zotero 运行时交互。
// =============================================================

// ---------------------------------------------------------------------------
// 1. 纯函数工具区
// ---------------------------------------------------------------------------

// ---------- 常量 ----------

const BASE_URL = "https://pubscholar.cn";
const PUBSCHOLAR_ARTICLES_URL = `${BASE_URL}/hky/open/resources/api/v1/articles`;

// 逆向分析得到的请求签名密钥。站点若轮换密钥或修改签名方案，本模块将整体失效，
// 需根据线上行为同步更新。配合下方手写 SHA-1 使用：
// Zotero 插件环境无法同步调用 crypto.subtle（其 API 为异步且受限），
// 故在此手写实现；签名结果已通过线上请求验证，请勿未经验证随意改动。
const PUBSCHOLAR_SIGNATURE_SECRET = "6m6pingbinwaktg227gngifoocrfbo95";

// Zotero 内置 RIS 转换器 ID，用于将抓取的元数据经 RIS 文本导入条目。
const RIS_TRANSLATOR_ID = "32d59d2d-b6a9-4a3a-bd44-1cc23d3d2c49";

// ---------- 类型 ----------

export type PubScholarArticle = {
  abstracts?: string;
  abstracts_abbreviation?: string;
  article_type?: string;
  author?: string[];
  authors?: PubScholarAuthor[];
  date?: string;
  doi?: string;
  first_page?: string;
  id?: string;
  institution?: string[];
  issue?: string;
  keywords?: string[];
  last_page?: string;
  links?: PubScholarLink[];
  source?: string;
  title?: string;
  type?: string;
  volume?: string;
  year?: string | number;
};

type PubScholarAuthor = {
  institution?: string[];
  name?: string;
};

type PubScholarLink = {
  name?: string;
  url?: string;
};

type PubScholarSearchResponse = {
  content?: PubScholarArticle[];
  error?: boolean;
  error_code?: string;
  error_message?: string;
  total?: number;
};

type HeaderOptions = {
  finger?: string;
  nonce?: string;
  timestamp?: string;
  xsrfToken?: string;
};

// ---------- 文本处理 ----------

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(text?: string | null): string {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}

export function stripHTML(text?: string | null): string {
  return normalizeWhitespace((text ?? "").replace(/<[^>]+>/g, ""));
}

function normalizeSearchTitle(title: string): string {
  return normalizeWhitespace(
    title
      .replace(/\.{2,}|…+/g, " ")
      .replace(/[_＿]+/g, " ")
      .replace(/[《》“”"':：,，.。;；()[\]（）【】]/g, " "),
  );
}

// 从标题中剔除作者名。作者名可能含正则元字符（如外文作者 "J. Smith"），需先转义。
function removeAuthorToken(title: string, author?: string): string {
  if (!author) return title;
  return normalizeWhitespace(
    title.replace(new RegExp(escapeRegExp(author), "g"), " "),
  );
}

function splitInformativeTokens(title: string): string[] {
  return normalizeSearchTitle(title)
    .replace(/的/g, " ")
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token);
}

// 依据文件名/PDF 提取的标题（可能带 "_作者" 后缀）构建候选查询，
// 按从精确到宽泛的顺序排列，去重后最多返回 4 条。
export function buildSearchQueries(searchOption: {
  author?: string;
  title: string;
}): string[] {
  const queries: string[] = [];
  const title = removeAuthorToken(
    normalizeSearchTitle(searchOption.title),
    searchOption.author,
  );
  const tokens = splitInformativeTokens(title);

  if (title) queries.push(title);
  if (tokens.length >= 2) {
    queries.push(tokens.join(" "));
    queries.push([tokens[0], tokens[tokens.length - 1]].join(" "));
  }

  return Array.from(new Set(queries)).slice(0, 4);
}

// 标题匹配判断：忽略空白与标点差异（文件名标题与 API 返回标题可能差一个空格/符号）。
function isTitleMatch(articleTitle: string, targetTitle: string): boolean {
  const compact = (text: string) => text.replace(/\s+/g, "");
  const a = compact(normalizeSearchTitle(articleTitle));
  const b = compact(targetTitle);
  return a === b || a.includes(b) || b.includes(a);
}

// ---------- 请求签名 ----------

function randomToken(length: number): string {
  let value = "";
  while (value.length < length) {
    value += Math.random().toString(36).slice(2).toUpperCase();
  }
  return value.slice(0, length);
}

function randomHex(length: number): string {
  let value = "";
  while (value.length < length) {
    value += Math.floor(Math.random() * 16).toString(16);
  }
  return value;
}

function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

// 手写 SHA-1（实现标准 FIPS 180-1 算法），原因见文件头部注释。
function sha1(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const highLength = Math.floor(bitLength / 0x100000000);
  const lowLength = bitLength >>> 0;
  for (let i = 3; i >= 0; i--) bytes.push((highLength >>> (i * 8)) & 0xff);
  for (let i = 3; i >= 0; i--) bytes.push((lowLength >>> (i * 8)) & 0xff);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let i = 0; i < bytes.length; i += 64) {
    const words = new Array<number>(80);
    for (let j = 0; j < 16; j++) {
      words[j] =
        (bytes[i + j * 4] << 24) |
        (bytes[i + j * 4 + 1] << 16) |
        (bytes[i + j * 4 + 2] << 8) |
        bytes[i + j * 4 + 3];
    }
    for (let j = 16; j < 80; j++) {
      words[j] = rotateLeft(
        words[j - 3] ^ words[j - 8] ^ words[j - 14] ^ words[j - 16],
        1,
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotateLeft(a, 5) + f + e + k + words[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4]
    .map((h) => (h >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

// 构建 API 请求头。nonce/timestamp/signature 为签名三要素，
// fingerprint 与 XSRF token 每次请求随机生成（与 Cookie 中的值保持一致）。
export function buildPubScholarHeaders(options: HeaderOptions = {}) {
  const nonce = options.nonce || randomToken(6);
  const timestamp = options.timestamp || Date.now().toString();
  const xsrfToken = options.xsrfToken || randomHex(32);
  const finger = options.finger || randomHex(32);
  const signature = sha1(
    [PUBSCHOLAR_SIGNATURE_SECRET, timestamp, nonce].sort().join(""),
  );

  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Content-Type": "application/json;charset=UTF-8",
    Cookie: `XSRF-TOKEN=${xsrfToken}`,
    Origin: BASE_URL,
    Referer: `${BASE_URL}/explore`,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
    nonce,
    signature,
    timestamp,
    "x-finger": finger,
    "x-xsrf-token": xsrfToken,
  };
}

// ---------- 字段映射 ----------

// API 返回的 article_type（如 "期刊论文"）映射到 Zotero 条目类型。
// 标准、专利、科技成果等其他类型暂按期刊处理，可按需扩展。
type ArticleItemType =
  | "thesis"
  | "conferencePaper"
  | "book"
  | "newspaperArticle"
  | "journalArticle";

function mapArticleItemType(articleType?: string): ArticleItemType {
  switch (articleType) {
    case "学位论文":
      return "thesis";
    case "会议论文":
      return "conferencePaper";
    case "图书":
      return "book";
    case "报纸文章":
      return "newspaperArticle";
    default:
      return "journalArticle";
  }
}

function risTypeForArticle(article: PubScholarArticle): string {
  switch (mapArticleItemType(article.article_type)) {
    case "thesis":
      return "THES";
    case "conferencePaper":
      return "CONF";
    case "book":
      return "BOOK";
    case "newspaperArticle":
      return "NEWS";
    default:
      return "JOUR";
  }
}

function getPages(article: PubScholarArticle): string {
  const start = normalizeWhitespace(article.first_page);
  const end = normalizeWhitespace(article.last_page);
  if (start && end) return `${start}-${end}`;
  return start || end;
}

function getArticleURL(article: PubScholarArticle): string {
  return article.links?.find((link) => link.url)?.url || `${BASE_URL}/explore`;
}

export function articleToSearchResult(
  article: PubScholarArticle,
): ScrapeSearchResult {
  const articleTitle = stripHTML(article.title);
  const author = article.author?.join(",") || "";
  const journal = normalizeWhitespace(article.source);
  const year = `${article.year || article.date || ""}`;
  const issue = normalizeWhitespace(article.issue);
  const volume = normalizeWhitespace(article.volume);
  const pages = getPages(article);

  return {
    source: "PubScholar",
    title: ` ${articleTitle} ${author} ${journal} ${year} ${volume} ${issue} ${pages}`,
    url: getArticleURL(article),
    abstract: normalizeWhitespace(article.abstracts),
    articleID: normalizeWhitespace(article.id),
    articleTitle,
    author,
    date: year || "",
    doi: normalizeWhitespace(article.doi),
    issue,
    journal,
    keywords: article.keywords?.join(",") || "",
    pages,
    pubScholarJSON: JSON.stringify(article),
    volume,
    year,
  };
}

// ---------- RIS 生成 ----------

function risLine(tag: string, value?: string | number | null): string[] {
  const text = normalizeWhitespace(value == null ? "" : `${value}`);
  if (!text) return [];
  return [`${tag}  - ${text}`];
}

// 生成 RIS 文本供 Zotero 内置 RIS 转换器导入。
// TY 依据 article_type 动态映射；摘要等 HTML 字段需先去除标签。
export function articleToRIS(
  article: PubScholarArticle,
  url = getArticleURL(article),
): string {
  const lines: string[] = [`TY  - ${risTypeForArticle(article)}`];
  lines.push(...risLine("T1", stripHTML(article.title)));
  for (const author of article.author || []) {
    lines.push(...risLine("AU", author));
  }
  lines.push(...risLine("JO", article.source));
  lines.push(...risLine("VL", article.volume));
  lines.push(...risLine("IS", article.issue));
  lines.push(...risLine("SP", article.first_page));
  lines.push(...risLine("EP", article.last_page));
  lines.push(...risLine("PY", article.year || article.date));
  if (article.keywords?.length) {
    lines.push(...risLine("KW", article.keywords.join(",")));
  }
  lines.push(...risLine("AB", stripHTML(article.abstracts)));
  const doi = normalizeWhitespace(article.doi);
  if (doi) lines.push(`DO  - ${doi}`);
  lines.push(...risLine("UR", url));
  lines.push("ER  -");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 2. PubScholar 服务实现
// ---------------------------------------------------------------------------

function parseStoredArticle(
  searchResult: ScrapeSearchResult,
): PubScholarArticle | null {
  const raw = searchResult.pubScholarJSON;
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as PubScholarArticle;
  } catch (error) {
    ztoolkit.log(`PubScholar parse stored metadata error: ${error}`);
    return null;
  }
}

async function importRIS(
  ris: string,
  libraryID: number,
): Promise<Zotero.Item[]> {
  const translate = new Zotero.Translate.Import();
  translate.setTranslator(RIS_TRANSLATOR_ID);
  translate.setString(ris);
  return translate.translate({
    libraryID,
    saveAttachments: false,
  });
}

// 仅当字段对该条目类型有效时才写入，避免 setField 对无效字段抛错
// （例如 thesis 类型没有 publicationTitle/volume/issue 等字段）。
function setItemField(item: Zotero.Item, name: string, value: string): void {
  if (!value) return;
  if (Zotero.ItemFields.getFieldIDFromTypeAndBase(item.itemTypeID, name)) {
    item.setField(name, value);
  }
}

// RIS 导入失败时的兜底：直接构建 Zotero 条目。
async function createItemFromArticle(
  article: PubScholarArticle,
  libraryID: number,
): Promise<Zotero.Item> {
  const item = new Zotero.Item(mapArticleItemType(article.article_type));
  item.libraryID = libraryID;

  setItemField(item, "title", stripHTML(article.title));
  setItemField(item, "date", `${article.year || article.date || ""}`);
  setItemField(item, "publicationTitle", article.source || "");
  setItemField(item, "volume", article.volume || "");
  setItemField(item, "issue", article.issue || "");
  setItemField(
    item,
    "pages",
    [article.first_page, article.last_page].filter(Boolean).join("-"),
  );
  setItemField(item, "DOI", article.doi || "");
  setItemField(item, "abstractNote", stripHTML(article.abstracts || ""));
  setItemField(item, "url", article.links?.find((link) => link.url)?.url || "");

  item.setCreators(
    (article.author || []).map((author) => ({
      creatorType: "author",
      fieldMode: 1,
      firstName: "",
      lastName: author,
    })),
  );
  if (article.keywords?.length) {
    item.setTags(article.keywords.map((tag) => ({ tag, type: 1 })));
  }
  await item.saveTx();
  return item;
}

export class PubScholar implements ScrapeService {
  private async requestArticles(
    query: string,
    orderField: "default" | "year" = "default",
  ): Promise<PubScholarArticle[]> {
    const headers = buildPubScholarHeaders();
    const postData = {
      page: 1,
      size: 20,
      order_field: orderField,
      order_direction: "desc",
      user_id: headers["x-finger"],
      lang: "zh",
      query,
    };
    const resp = await Zotero.HTTP.request("POST", PUBSCHOLAR_ARTICLES_URL, {
      body: JSON.stringify(postData),
      headers,
      successCodes: [200],
      timeout: 10000,
    });
    let data: PubScholarSearchResponse;
    try {
      data = JSON.parse(resp.responseText) as PubScholarSearchResponse;
    } catch (error) {
      // 反爬/WAF 拦截时可能返回 HTML 而非 JSON
      ztoolkit.log(`PubScholar API 返回非 JSON 响应: ${error}`);
      return [];
    }
    if (data.error) {
      ztoolkit.log(
        `PubScholar API error: ${data.error_code} ${data.error_message}`,
      );
      return [];
    }
    // 仅取第一页（size 20）。响应中的 total/total_pages 未使用：
    // 查询已足够精确（通常为完整标题），翻页会成倍增加请求量。
    return data.content || [];
  }

  async search(
    searchOption: SearchOption,
  ): Promise<ScrapeSearchResult[] | null> {
    ztoolkit.log("PubScholar search options: ", searchOption);
    const queries = buildSearchQueries(searchOption);
    // 归一化后的目标标题（剔除作者与标点），用于判断是否已命中目标、提前返回，
    // 避免对每个查询×排序组合都打满请求（最多 4 查询 × 2 排序）。
    const targetTitle = removeAuthorToken(
      normalizeSearchTitle(searchOption.title),
      searchOption.author,
    );
    const seen = new Set<string>();
    const results: ScrapeSearchResult[] = [];

    for (const query of queries) {
      for (const orderField of ["default", "year"] as const) {
        const articles = await this.requestArticles(query, orderField);
        ztoolkit.log(
          `PubScholar search "${query}" (${orderField}) found ${articles.length} items.`,
        );
        for (const article of articles) {
          const result = articleToSearchResult(article);
          const key =
            (result.articleID as string) ||
            `${result.articleTitle}-${result.author}-${result.journal}`;
          if (!result.articleTitle || seen.has(key)) continue;
          seen.add(key);
          results.push(result);
        }
        if (
          targetTitle &&
          results.some((result) =>
            isTitleMatch(result.articleTitle as string, targetTitle),
          )
        ) {
          return results;
        }
      }
    }

    return results.length ? results : null;
  }

  async translate(
    searchResult: ScrapeSearchResult,
    libraryID: number,
    saveAttachments: false,
  ): Promise<ScrapeTranslateResult> {
    ztoolkit.log(`PubScholar translate: ${searchResult.title}`);
    let article = parseStoredArticle(searchResult);

    // 兜底：searchResult 中未携带原始元数据时，按标题重新搜索定位。
    if (!article && searchResult.articleTitle) {
      const results = await this.search({
        author:
          typeof searchResult.author === "string"
            ? searchResult.author
            : undefined,
        title: searchResult.articleTitle as string,
      });
      const matched = results?.find(
        (result) =>
          result.articleID === searchResult.articleID ||
          result.articleTitle === searchResult.articleTitle,
      );
      article = matched ? parseStoredArticle(matched) : null;
    }

    if (!article) {
      return { status: "empty", items: [] };
    }

    const ris = articleToRIS(article, searchResult.url);
    try {
      const items = await importRIS(ris, libraryID);
      if (items.length) {
        return { status: "success", items };
      }
      ztoolkit.log("PubScholar RIS import returned no items.");
    } catch (error) {
      ztoolkit.log(`PubScholar RIS import failed: ${error}`);
    }

    try {
      const item = await createItemFromArticle(article, libraryID);
      return { status: "success", items: [item] };
    } catch (error) {
      return {
        status: "error",
        error: `PubScholar translation failed: ${error}`,
      };
    }
  }
}
