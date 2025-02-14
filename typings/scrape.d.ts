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

type TaskStatus =
  | "waiting"
  | "processing"
  | "multiple_results"
  | "success"
  | "fail";
type TaskType = "attachment" | "snapshot";
interface ScrapeTask {
  id: string;
  type: TaskType;
  item: Zotero.Item;
  searchResults: ScrapeSearchResult[];
  resultIndex?: 0;
  status: TaskStatus;
  silent?: boolean;
  message?: string;
  addMsg: (msg: string) => void;
}
