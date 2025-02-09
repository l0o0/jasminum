interface ScrapeService {
  search(searchOption: SearchOption): Promise<ScrapeSearchResult[] | null>;
  searchSnapshot?(task: ScrapeTask): Promise<ScrapeSearchResult[] | null>;
  translate(
    task: ScrapeTask,
    saveAttachments: false,
  ): Promise<Zotero.Item | null | undefined>;
  translateSnapshot?(task: ScrapeTask): Promise<Zotero.Item | null | undefined>;
}

type SearchOption = {
  author?: string;
  title: string;
};

type ScrapeSearchResult = {
  source: string;
  title: string;
  url: string;
  [key: string]: string | number | null;
};

type ScrapeTask = {
  id: string;
  type: "attachment" | "snapshot" | "book";
  item: Zotero.Item;
  searchResults?: ScrapeSearchResult[];
  resultIndex?: 0;
  status: "waiting" | "processing" | "multiple_results" | "success" | "fail";
  silent?: boolean;
  errorMsg?: string;
};
