import { metaSearch, metaTranslate } from "../modules/services";
import { getString } from "./locale";
import { attachmentSearch, importAttachment } from "../modules/attachments";

// 创建 Deferred 的工厂函数
function createDeferred<T>(): DeferredResult<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export class ScraperTask implements ScraperTask {
  public id: string;
  public item: Zotero.Item;
  public type: ScraperTaskType;
  public message?: string;
  public silent?: false;
  public deferred?: DeferredResult;
  public resultIndex?: 0;

  private _status: TaskStatus;
  private _searchResults: ScrapeSearchResult[] = [];

  constructor(item: Zotero.Item, type: ScraperTaskType, silent?: false) {
    this.id = Zotero.Utilities.Internal.md5(item.id.toString());
    this.item = item;
    this.type = type;
    this.silent = false;
    this._status = "waiting";
  }

  // 添加消息的方法（不需要通过代理）
  addMsg(message: string) {
    if (this.message) {
      this.message = this.message + "\n" + message;
    } else {
      this.message = message;
    }
  }

  // 使用 setter 处理属性变更
  set status(newStatus: TaskStatus) {
    const oldStatus = this._status;
    // if (oldStatus === newStatus) return;
    this._status = newStatus;
    ztoolkit.log(
      `task ${this.id} changes "status" from "${oldStatus}" to "${newStatus}"`,
    );
    addon.data.progress.updateTaskStatus(this, newStatus);
    if (newStatus === "multiple_results") {
      this.deferred = createDeferred<number>();
    }
  }
  get status(): TaskStatus {
    return this._status;
  }

  set searchResults(results: ScrapeSearchResult[]) {
    this._searchResults = results;
    ztoolkit.log("searchResult changed");
    if (results && results.length > 1) {
      addon.data.progress.updateTaskSearchResult(this, results);
    }
  }
  get searchResults() {
    return this._searchResults;
  }
}

export class AttachmentTask implements AttachmentTask {
  public id: string;
  public item: Zotero.Item;
  public type: AttachmentTaskType;
  public message?: string;
  public silent?: false;
  public deferred?: DeferredResult;
  public resultIndex?: 0;

  private _status: TaskStatus;
  private _searchResults: AttachmentSearchResult[] = [];

  constructor(item: Zotero.Item, type: AttachmentTaskType, silent?: false) {
    this.id = Zotero.Utilities.Internal.md5(item.id.toString());
    this.item = item;
    this.type = type;
    this.silent = false;
    this._status = "waiting";
  }

  // 添加消息的方法（不需要通过代理）
  addMsg(message: string) {
    if (this.message) {
      this.message = this.message + "\n" + message;
    } else {
      this.message = message;
    }
  }

  // 使用 setter 处理属性变更
  set status(newStatus: TaskStatus) {
    const oldStatus = this._status;
    // if (oldStatus === newStatus) return;
    this._status = newStatus;
    ztoolkit.log(
      `task ${this.id} changes "status" from "${oldStatus}" to "${newStatus}"`,
    );
    addon.data.progress.updateTaskStatus(this, newStatus);
    if (newStatus === "multiple_results") {
      this.deferred = createDeferred<number>();
    }
  }
  get status(): TaskStatus {
    return this._status;
  }

  set searchResults(results: AttachmentSearchResult[]) {
    this._searchResults = results;
    ztoolkit.log("searchResult changed");
    if (results && results.length > 1) {
      addon.data.progress.updateTaskSearchResult(this, results);
    }
  }
  get searchResults() {
    return this._searchResults;
  }
}

export class TaskRunner {
  public tasks: (AttachmentTask | ScraperTask)[] = [];
  getTaskType(
    task: AttachmentTask | ScraperTask | string,
  ): "metaScraper" | "attachmentScraper" {
    let taskType: string;
    if (typeof task === "string") {
      taskType = task;
    } else {
      taskType = task.type;
    }

    if (taskType == "attachment" || taskType == "snapshot") {
      return "metaScraper";
    } else if (taskType == "local" || taskType == "remote") {
      return "attachmentScraper";
    } else {
      throw new Error(`Unknown task type: ${taskType}`);
    }
  }
  createTask(
    item: Zotero.Item,
    type: ScraperTaskType | AttachmentTaskType,
    silent?: false,
  ): ScraperTask | AttachmentTask {
    const taskType = this.getTaskType(type);
    let task: ScraperTask | AttachmentTask;
    if (taskType === "attachmentScraper") {
      task = new AttachmentTask(item, type as AttachmentTaskType, silent);
    } else if (taskType === "metaScraper") {
      task = new ScraperTask(item, type as ScraperTaskType, silent);
    } else {
      throw new Error(`Unknown task type: ${type}`);
    }
    // Set the default index for silent tasks
    // If the task is silent, set the resultIndex to 0
    if (silent) {
      task.resultIndex = 0;
    }
    return task;
  }

  async addTask(
    task: AttachmentTask | ScraperTask,
  ): Promise<string | undefined> {
    if (this.getTaskById(task.id)) {
      ztoolkit.log(`Task with ID ${task.id} already exists.`);
      if (addon.data.progress.progressWindow) {
        addon.data.progress.progressWindow.alert(
          getString("task-already-exists", {
            args: { title: task.item.getField("title") },
          }),
        );
      }
      return;
    }
    this.tasks.push(task);
    await addon.data.progress.addTaskToProgressWindow(task);
    ztoolkit.log(`Task with ID ${task.id} added.`);
    await this.runTask(task);
    return task.id;
  }

  async createAndAddTask(
    item: Zotero.Item,
    type: ScraperTaskType | AttachmentTaskType,
    silent?: false,
  ): Promise<string> {
    const task = this.createTask(item, type, silent);
    await this.addTask(task);
    return task.id;
  }
  getTaskById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  async runTask(task: AttachmentTask | ScraperTask): Promise<void> {
    if (this.getTaskType(task) === "attachmentScraper") {
      this.runAttachmentTask(task as AttachmentTask);
    } else {
      this.runScrapeTask(task as ScraperTask);
    }
  }

  async runScrapeTask(task: ScraperTask): Promise<void> {
    // Implement the logic to run the scrape task
    ztoolkit.log(`Running scrape task with ID: ${task.id}`);
    try {
      await metaSearch(task);
    } catch (e) {
      ztoolkit.log(`Error in metaSearch: ${e}`);
      task.addMsg(`Error in metaSearch: ${e}`);
      task.status = "fail";
      return;
    }
    // Wait for user select result.
    if (task.status === "multiple_results") {
      task.resultIndex = await task.deferred?.promise;
    }
    if (task.status != "fail") {
      await metaTranslate(task);
    }
  }

  async runAttachmentTask(task: AttachmentTask): Promise<void> {
    await attachmentSearch(task);
    // Wait for user select result.
    if (task.status === "multiple_results") {
      task.resultIndex = await task.deferred?.promise;
    }
    if (task.status != "fail") {
      await importAttachment(task);
    }
  }

  resumeTask(taskID: string, resultIndex: number): void {
    const task = this.getTaskById(taskID);
    if (task?.deferred) {
      task.deferred.resolve(resultIndex);
    }
  }
}
