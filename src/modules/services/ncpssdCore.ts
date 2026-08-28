export const NCPSSD_SOURCE = "NCPSSD";
export const NCPSSD_BASE_URL = "https://www.ncpssd.cn";
export const NCPSSD_SEARCH_URL = `${NCPSSD_BASE_URL}/searchHandler/search`;

const CHINESE_JOURNAL_ARTICLE = "中文期刊文章";

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
    const volume = stringValue(row.vol);
    const issue = stringValue(row.num);
    const pages = getPages(row);
    const issn = stringValue(row.issn);
    const doi = stringValue(row.doi);
    const displayTitle = [
      articleTitle,
      author,
      journal,
      year,
      volume,
      issue,
      pages,
    ]
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
      doi,
      issue,
      issn,
      journal,
      pages,
      volume,
      year,
    });
  }

  return results;
}
