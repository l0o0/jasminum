import { compareTwoStrings } from "string-similarity";
import { getArgsFromPattern } from "../../utils/pattern";
import { getPDFTitle } from "../../utils/pdfParser";
import { getMetadataSources, getPref } from "../../utils/prefs";
import type { ScraperTask } from "../../utils/task";
import { isChineseTopAttachment, isChinsesSnapshot } from "../../utils/detect";
import { getConfiguredLLMClient } from "../../utils/llm";
import { recognizePDFAttachment } from "../../utils/pdfMetadata";
import { getString } from "../../utils/locale";
import { CNKI } from "./cnki";
import { PubScholar } from "./pubscholar";
import { NCPSSD } from "./ncpssd";
import { Yiigle } from "./yiigle";
import { WanfangData } from "./wanfangdata";
import { Douban } from "./douban";
import { Wenjin } from "./wenjin";
import { runSequentialSearchChain } from "./searchChain";
import { saveMetadataItem } from "./importItem";

interface MetadataSource {
  service: ScrapeService;
  kind: "article" | "book";
  resultSource?: string;
  searchDisabled?: boolean;
}

const sources: Record<string, MetadataSource> = {
  CNKI: { service: new CNKI(), kind: "article" },
  PubScholar: { service: new PubScholar(), kind: "article" },
  NCPSSD: { service: new NCPSSD(), kind: "article" },
  Yiigle: {
    service: new Yiigle(),
    kind: "article",
    resultSource: "中华医学",
  },
  WanFangData: {
    service: new WanfangData(),
    kind: "article",
    resultSource: "万方数据",
    searchDisabled: true,
  },
  Douban: { service: new Douban(), kind: "book" },
  Wenjin: { service: new Wenjin(), kind: "book" },
};
const getBookString = (key: string) => getString(`book-metadata-${key}`);

async function getSearchOption(
  item: Zotero.Item,
  kind: MetadataSource["kind"] = "article",
): Promise<SearchOption | null> {
  const pattern = getPref("namePattern");
  let option: SearchOption | null = null;
  if (pattern === "auto") {
    try {
      const title = await getPDFTitle(item.id);
      if (title) option = { title };
    } catch (error) {
      ztoolkit.log(`PDF title parsing error: ${error}`);
    }
    if (!option && kind === "article")
      option = getArgsFromPattern(item.attachmentFilename, "{%t}_{%g}");
  } else {
    option = getArgsFromPattern(
      item.attachmentFilename,
      pattern === "custom" ? getPref("namePatternCustom") : pattern,
    );
  }
  if (kind === "article") return option;
  const title = (
    option?.title || item.attachmentFilename.replace(/\.pdf$/i, "")
  ).trim();
  if (!title) throw new Error(getBookString("no-query"));
  return { title };
}

function normalizeBookTitle(title: string): string {
  return title.replace(/[《》\s]/g, "").toLowerCase();
}

function calculateSimilarity(
  results: ScrapeSearchResult[],
  searchTitle: string,
  kind: MetadataSource["kind"] = "article",
): void {
  const book = kind === "book";
  const title = book ? normalizeBookTitle(searchTitle) : searchTitle;
  for (const result of results) {
    const resultTitle = book
      ? normalizeBookTitle(String(result.articleTitle || result.title))
      : (result.articleTitle as string);
    result.similarity = compareTwoStrings(title, resultTitle);
  }
}

function isTokenCovered(searchTitle: string, resultTitle: string): boolean {
  const tokens = searchTitle
    .replace(/\.{2,}|…+/g, " ")
    .replace(/[_＿]+/g, " ")
    .replace(/[《》“”"':：,，.。;；()[\]（）【】]/g, " ")
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return (
    tokens.length >= 2 && tokens.every((token) => resultTitle.includes(token))
  );
}

function hasExactMatch(results: ScrapeSearchResult[]): boolean {
  return results.some((result) => result.similarity === 1);
}

function finishSearch(task: ScraperTask, results: ScrapeSearchResult[]): void {
  if (task.cancelled) return;
  if (task.type === "book") {
    task.summary = getBookString(
      results.length > 1 ? "found" : results.length ? "importing" : "empty",
    );
  }
  task.searchResults = results;
  if (!results.length) task.addMsg(task.summary || "No search results");
  task.status = !results.length
    ? "fail"
    : results.length > 1
      ? "multiple_results"
      : "processing";
}

async function recognizeMetadata(task: ScraperTask): Promise<boolean> {
  let client;
  try {
    client = getConfiguredLLMClient();
  } catch (error) {
    task.addMsg((error as Error).message);
    return false;
  }
  try {
    task.addMsg(getString("ai-recognition-start"));
    task.pageProgress = { completed: 0, total: 0 };
    task.summary = getString("metadata-update-rendering");
    addon.data.progress.updateTaskStatus(task, task.status);
    const result = await recognizePDFAttachment(client, task.item.id, {
      signal: task.signal,
      onProgress: (stage, pages) => {
        if (task.cancelled) return;
        task.pageProgress = {
          completed: stage === "complete" ? (pages ?? 0) : 0,
          total: pages ?? 0,
        };
        task.summary =
          stage === "rendering"
            ? getString("metadata-update-rendering")
            : getString("metadata-update-recognizing", {
                args: { pages: pages ?? 0 },
              });
        addon.data.progress.updateTaskStatus(task, task.status);
      },
    });
    if (task.cancelled) return false;
    if (result) {
      task.aiMetadata = result.metadata;
      return true;
    }
    task.addMsg(getString("ai-recognition-empty"));
  } catch {
    // Response bodies and API credentials must stay out of task logs.
    if (!task.cancelled) task.addMsg(getString("ai-recognition-failed"));
  } finally {
    task.pageProgress = undefined;
    task.summary = undefined;
    addon.data.progress.updateTaskStatus(task, task.status);
  }
  return false;
}

export async function metaSearch(task: ScraperTask): Promise<void> {
  if (task.cancelled) return;
  task.aiMetadata = undefined;
  task.searchResults = [];
  task.resultIndex = undefined;
  task.summary = task.type === "book" ? getBookString("searching") : undefined;
  task.status = "processing";
  if (task.type === "book") return searchBookMetadata(task);
  if (!isChineseTopAttachment(task.item) && !isChinsesSnapshot(task.item)) {
    task.addMsg("No Chinese attachment or snapshot items found.");
    task.status = "fail";
    return;
  }
  if (task.type === "snapshot") {
    const results = await sources.CNKI.service.searchSnapshot!(task);
    finishSearch(task, results || []);
    return;
  }

  const metadataSources = getMetadataSources();
  const results: ScrapeSearchResult[] = [];
  let option: SearchOption | null | undefined;
  task.addMsg(`Source order: ${metadataSources.join(", ")}`);
  for (const name of metadataSources) {
    if (task.cancelled) return;
    if (name === "AI") {
      if (!results.length && task.item.isPDFAttachment()) {
        if (await recognizeMetadata(task)) return;
      }
      continue;
    }
    const source = Object.hasOwn(sources, name) ? sources[name] : undefined;
    if (!source || source.kind !== "article" || source.searchDisabled) {
      task.addMsg(`Skipping unavailable source: ${name}`);
      continue;
    }
    // AI reads the PDF directly, so website query preparation stays lazy.
    if (option === undefined) {
      try {
        option = await getSearchOption(task.item);
      } catch {
        option = null;
      }
      task.addMsg(`Search option: ${JSON.stringify(option)}`);
      if (!option) task.addMsg("Filename parsing error");
    }
    if (task.cancelled) return;
    if (!option) continue;
    const query = option;
    const found = await runSequentialSearchChain(
      [{ name, enabled: true, search: () => source.service.search(query) }],
      query.title,
      {
        scoreResults: calculateSimilarity,
        hasExactMatch,
        onResult: (name, found) =>
          task.addMsg(`Found ${found.length} results from ${name}`),
        onError: (name, error) => task.addMsg(`${name} search error: ${error}`),
      },
    );
    if (task.cancelled) return;
    const reliable = found.filter(
      (result) =>
        (result.articleTitle as string).includes(query.title) ||
        Number(result.similarity) >
          parseFloat(getPref("similarityThresholdForMetaData")) ||
        isTokenCovered(query.title, result.articleTitle as string),
    );
    results.push(...reliable);
    task.addMsg(
      `After filtering, ${reliable.length} results left from ${name}.`,
    );
    if (hasExactMatch(reliable)) {
      task.addMsg(`Exact match found in ${name}, skipping later services`);
      break;
    }
  }
  finishSearch(task, results);
}

export function canRetrieveBookMetadata(item: Zotero.Item): boolean {
  return (
    !item.deleted &&
    item.isPDFAttachment() &&
    item.isTopLevelItem() &&
    item.isEditable()
  );
}

export async function getBookSearchOption(
  item: Zotero.Item,
): Promise<SearchOption> {
  return (await getSearchOption(item, "book"))!;
}

async function searchBookMetadata(task: ScraperTask): Promise<void> {
  if (!canRetrieveBookMetadata(task.item))
    throw new Error(getBookString("unavailable"));
  const option = await getBookSearchOption(task.item);
  if (task.cancelled) return;
  task.addMsg(`Title: ${option.title}`);
  const threshold =
    Number.parseFloat(getPref("similarityThresholdForMetaData")) || 0.6;
  const results = await runSequentialSearchChain(
    Object.entries(sources)
      .filter(([, source]) => source.kind === "book" && !source.searchDisabled)
      .map(([name, source]) => ({
        name,
        enabled: true,
        search: async () => {
          if (task.cancelled) return null;
          const found = await source.service.search(option);
          return task.cancelled ? null : found;
        },
      })),
    option.title,
    {
      scoreResults: (found, title) => calculateSimilarity(found, title, "book"),
      // Matching titles can represent different editions across book sources.
      hasExactMatch: () => false,
      onResult: (name, found) => task.addMsg(`${name}: ${found.length}`),
      onError: (name, error) => task.addMsg(`${name}: ${error}`),
    },
  );
  finishSearch(
    task,
    results.filter((result) => Number(result.similarity) >= threshold),
  );
}

export async function metaTranslate(task: ScraperTask): Promise<void> {
  if (task.cancelled) return;
  const originalParentID = task.item.parentID;
  let createdItems: Zotero.Item[] = [];
  let saved = false;
  try {
    let item: Zotero.Item;
    let selected: ScrapeSearchResult | undefined;
    if (task.aiMetadata) {
      item = new Zotero.Item(task.aiMetadata.itemType);
      item.libraryID = task.item.libraryID;
      item.fromJSON(task.aiMetadata);
    } else {
      task.resultIndex = task.resultIndex ?? 0;
      selected = task.searchResults[task.resultIndex];
      if (!selected)
        throw new Error(
          task.type === "book"
            ? getBookString("empty")
            : "No search results found.",
        );
      const sourceName = selected.source;
      const source = Object.entries(sources).find(
        ([name, source]) =>
          name === sourceName || source.resultSource === sourceName,
      )?.[1];
      const kind = task.type === "book" ? "book" : "article";
      if (!source || source.kind !== kind)
        throw new Error(`Unsupported source: ${selected.source}`);
      if (task.type === "book") task.summary = getBookString("importing");
      task.status = "processing";
      const result = await source.service.translate(
        selected,
        task.item.libraryID,
        false,
      );
      if (result.status === "error") throw new Error(result.error);
      if (result.status === "empty")
        throw new Error("Translation returned no item.");
      createdItems = result.items;
      if (task.cancelled) return;
      if (createdItems.length !== 1)
        throw new Error(
          `Expected one translated item, received ${createdItems.length}.`,
        );
      item = createdItems[0];
      if (task.type === "book" && item.itemType !== "book")
        throw new Error(getBookString("not-book"));
    }
    if (task.item.parentID !== originalParentID)
      throw new Error(
        "The original item's parent changed during metadata retrieval.",
      );
    await saveMetadataItem(task, item, selected);
    saved = true;
    if (task.cancelled) return;
    task.summary = task.type === "book" ? getBookString("complete") : undefined;
    task.status = "success";
  } catch (error) {
    if (task.cancelled) return;
    task.summary = undefined;
    task.addMsg(
      task.aiMetadata
        ? getString("ai-recognition-save-failed")
        : `ERROR: ${error}`,
    );
    task.status = "fail";
  } finally {
    if (!saved) {
      // Web translators create these items before the attachment transaction.
      for (const item of createdItems) {
        try {
          await item.eraseTx();
        } catch (error) {
          task.addMsg(`Failed to remove translated item ${item.id}: ${error}`);
          if (!task.cancelled) task.status = "fail";
        }
      }
    }
  }
}
