export interface SequentialSearchStage {
  name: string;
  enabled: boolean;
  search(): Promise<ScrapeSearchResult[] | null>;
}

export interface SequentialSearchCallbacks {
  scoreResults(results: ScrapeSearchResult[], searchTitle: string): void;
  hasExactMatch(results: ScrapeSearchResult[]): boolean;
  onResult?(name: string, results: ScrapeSearchResult[]): void;
  onError?(name: string, error: unknown): void;
  onExactMatch?(name: string): void;
}

export async function runSequentialSearchChain(
  stages: SequentialSearchStage[],
  searchTitle: string,
  callbacks: SequentialSearchCallbacks,
): Promise<ScrapeSearchResult[]> {
  const combinedResults: ScrapeSearchResult[] = [];

  for (const stage of stages) {
    if (!stage.enabled) continue;

    let results: ScrapeSearchResult[] | null;
    try {
      results = await stage.search();
    } catch (error) {
      callbacks.onError?.(stage.name, error);
      continue;
    }

    if (results === null) continue;

    callbacks.scoreResults(results, searchTitle);
    callbacks.onResult?.(stage.name, results);
    combinedResults.push(...results);

    if (callbacks.hasExactMatch(results)) {
      callbacks.onExactMatch?.(stage.name);
      break;
    }
  }

  return combinedResults;
}
