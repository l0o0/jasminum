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
type ScraperTaskType = "attachment" | "snapshot";
type AttachmentTaskType = "local" | "remote";
interface Task {
  id: string;
  type: string;
  item: Zotero.Item;
  resultIndex?: 0;
  status: TaskStatus;
  silent?: boolean;
  message?: string;
  addMsg: (msg: string) => void;
  deferred?: DeferredResult;
  searchResults?: any[];
}

interface ScrapeTask extends Task {
  type: ScraperTaskType;
  searchResults?: ScrapeSearchResult[];
}

// 定义 Deferred 类型，用于等待用户输入，选择合适的结果索引
type DeferredResult<T = any> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};
