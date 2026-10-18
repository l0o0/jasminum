import { writePDFOutline } from "./savePDF";
import { adaptOutlinePDFDocument } from "./pdfAdapter";
import { getString } from "../../utils/locale";
import {
  createTreeNodes,
  getOutlineFromPage,
  getOutlineFromPDF,
  saveOutlineToJSON,
} from "./outline";
import { headingTree, OutlineRecognitionAgent } from "./recognitionAgent";

function outlineSnapshot(nodes: OutlineNode[]): string {
  const normalize = (nodes: OutlineNode[]): unknown[] =>
    nodes.map((node) => ({
      title: node.title,
      page: node.page,
      x: node.x,
      y: node.y,
      level: node.level,
      collapsed: !!node.collapsed,
      children: normalize(node.children ?? []),
    }));
  return JSON.stringify(normalize(nodes));
}

const t = (key: string) => getString(`outline-ai-${key}`);
export class OutlineTask implements Task {
  readonly type = "outline";
  readonly silent = false;
  readonly id: string;
  message = "";
  summary = t("queued");
  private _status: TaskStatus = "waiting";
  private agent?: OutlineRecognitionAgent;
  private diskBaseline = "";
  private original: OutlineNode[] = [];
  private baseline = "";
  private afterSave = "";
  private stopping = false;
  private executing = false;
  private listeners = new Set<() => void>();
  previewRevision = 0;
  applied = false;
  saving = false;
  constructor(readonly item: Zotero.Item) {
    this.id = `outline-${item.id}`;
  }
  get status() {
    return this._status;
  }
  set status(value: TaskStatus) {
    this._status = value;
    this.notify();
  }
  get headings() {
    return this.agent?.headings ?? [];
  }
  get completedPages() {
    return (this.agent?.nextPage ?? 1) - 1;
  }
  get totalPages() {
    return this.agent?.pdf.numPages ?? 0;
  }
  get canApply() {
    return (
      this.status === "success" &&
      !!this.headings.length &&
      !this.applied &&
      !this.saving
    );
  }
  get canResume() {
    return (
      !this.executing &&
      !this.saving &&
      (this.status === "paused" || this.status === "fail")
    );
  }
  get canRestart() {
    return !this.executing && !this.saving && this.status === "success";
  }
  addMsg(message: string) {
    this.message += `${this.message ? "\n" : ""}${message}`;
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify() {
    addon.data.progress.updateTaskStatus(this, this.status);
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        ztoolkit.log(error);
      }
    }
  }
  stop() {
    if (this.status !== "processing" && this.status !== "waiting") return;
    this.stopping = true;
    this.agent?.stop();
    this.summary = t("stopping");
    if (!this.executing) {
      this.summary = t("stopped");
      this.status = "paused";
    } else this.status = "paused";
  }
  prepareRetry() {
    if (!this.canResume && !this.canRestart) return false;
    if (this.canRestart) {
      this.agent = undefined;
      this.applied = false;
      this.message = "";
    }
    this.stopping = false;
    this.summary = t("queued");
    this.status = "waiting";
    return true;
  }
  async run() {
    if (this.executing || this.status !== "waiting") return;
    this.executing = true;
    this.status = "processing";
    try {
      if (!this.agent) {
        if (
          this.item.deleted ||
          !this.item.isPDFAttachment() ||
          !this.item.isEditable() ||
          !(await this.item.getFilePathAsync())
        )
          throw new Error(t("no-pdf"));
        const stored = (await getOutlineFromPDF(this.item)) ?? [];
        this.diskBaseline = outlineSnapshot(stored);
        const openDoc = this.openReaders()
          .map((r) => r._iframeWindow?.document)
          .find((doc) => doc?.getElementById("root-list"));
        this.original = openDoc ? getOutlineFromPage(openDoc) : stored;
        this.baseline = outlineSnapshot(this.original);
        this.agent = new OutlineRecognitionAgent(
          this.item.id,
          await adaptOutlinePDFDocument(
            (await this.item.getFilePathAsync()) || "",
          ),
        );
      }
      if (this.stopping) {
        this.summary = t("stopped");
        this.status = "paused";
        return;
      }
      const complete = await this.agent.run((page, total, lastPage) => {
        this.summary = `${t("running")} ${page}–${lastPage ?? page} / ${total}`;
        this.notify();
      });
      this.summary = t(
        complete ? (this.headings.length ? "review" : "empty") : "stopped",
      );
      this.status = complete ? "success" : "paused";
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (this.stopping) {
        this.summary = t("stopped");
        this.status = "paused";
      } else {
        this.addMsg(detail);
        this.summary = t("failed");
        this.status = "fail";
      }
    } finally {
      this.executing = false;
      this.notify();
    }
  }
  get canEdit() {
    return (
      !this.executing &&
      !this.saving &&
      !this.applied &&
      ["success", "paused", "fail"].includes(this.status)
    );
  }
  editHeading(index: number, key: string): number {
    const headings = this.headings;
    if (!this.canEdit || !headings[index]) return index;
    let focus = index;
    if (key === "Delete" || key === "Backspace") {
      headings.splice(index, 1);
      focus = Math.min(index, headings.length - 1);
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      const level = headings[index].level + (key === "ArrowLeft" ? -1 : 1);
      if (level < 1 || level > 7) return index;
      headings[index].level = level;
    } else return index;
    this.previewRevision++;
    this.notify();
    return focus;
  }
  async changeHeadingPage(index: number, page: number): Promise<boolean> {
    const heading = this.headings[index];
    if (
      !this.canEdit ||
      !heading ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > this.totalPages
    )
      return false;
    if (heading.page === page) return true;
    this.saving = true;
    this.notify();
    try {
      const target = await this.agent!.pdf.getPage(page);
      const viewport = target.getViewport({ scale: 1 });
      const [x, y] = viewport.convertToPdfPoint(
        heading.left * viewport.width,
        heading.top * viewport.height,
      );
      Object.assign(heading, { page, x, y, exact: false });
      this.previewRevision++;
      return true;
    } finally {
      this.saving = false;
      this.notify();
    }
  }
  moveHeading(from: number, slot: number): number {
    if (
      !this.canEdit ||
      !Number.isInteger(from) ||
      !Number.isInteger(slot) ||
      !this.headings[from] ||
      slot < 0 ||
      slot > this.headings.length
    )
      return from;
    const target = slot > from ? slot - 1 : slot;
    if (target === from) return from;
    const [heading] = this.headings.splice(from, 1);
    this.headings.splice(target, 0, heading);
    this.previewRevision++;
    this.notify();
    return target;
  }
  reportError(error: unknown) {
    this.addMsg(error instanceof Error ? error.message : String(error));
    this.summary = t("error-details");
    this.notify();
  }
  private openReaders() {
    return Zotero.Reader._readers.filter(
      (reader) => reader._item.id === this.item.id,
    );
  }
  async navigate(index: number) {
    const h = this.headings[index];
    if (!h) return;
    const reader = await Zotero.Reader.open(this.item.id);
    if (!reader) throw new Error(t("reader-error"));
    await reader._initPromise;
    await reader.navigate({
      position: { pageIndex: h.page - 1, rects: [[h.x, h.y, h.x, h.y]] },
    });
  }
  private async save(nodes: OutlineNode[], expected: string) {
    if (this.item.deleted || !this.item.isEditable())
      throw new Error(t("no-pdf"));
    if (
      outlineSnapshot((await getOutlineFromPDF(this.item)) ?? []) !==
      this.diskBaseline
    )
      throw new Error(t("changed"));
    const documents = this.openReaders()
      .map((reader) => reader._iframeWindow?.document)
      .filter((doc): doc is Document => !!doc?.getElementById("root-list"));
    if (
      documents.some(
        (doc) => outlineSnapshot(getOutlineFromPage(doc)) !== expected,
      )
    )
      throw new Error(t("changed"));
    await writePDFOutline(this.item, nodes);
    await saveOutlineToJSON(this.item, nodes);
    this.diskBaseline = outlineSnapshot(nodes);
    for (const doc of documents) {
      const list = doc.getElementById("root-list")!;
      list.replaceChildren();
      createTreeNodes(nodes, list, doc);
    }
    for (const reader of this.openReaders()) {
      try {
        await (reader.reload as () => Promise<void>)();
      } catch (error) {
        this.addMsg(getString("outline-refresh-failed"));
        ztoolkit.log("PDF outline saved, but reader refresh failed", error);
      }
    }
    return outlineSnapshot(nodes);
  }
  async apply() {
    if (!this.canApply) return;
    this.saving = true;
    this.notify();
    try {
      this.afterSave = await this.save(
        headingTree(this.headings),
        this.baseline,
      );
      this.applied = true;
      this.summary = t("saved");
    } finally {
      this.saving = false;
      this.notify();
    }
  }
  async undo() {
    if (!this.applied || this.saving) return;
    this.saving = true;
    this.notify();
    try {
      this.baseline = await this.save(this.original, this.afterSave);
      this.applied = false;
      this.summary = t("restored");
    } finally {
      this.saving = false;
      this.notify();
    }
  }
}
