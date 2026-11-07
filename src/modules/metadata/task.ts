import { getString } from "../../utils/locale";
import { retrieveFromPDF, type MetadataCandidate } from "./retrieve";
import { buildChanges, type FieldChange, type MetadataSnapshot } from "./diff";
import { applyChanges, snapshotItem } from "./apply";

const t = (key: string) => getString(`metadata-update-${key}`);
export class MetadataTask implements Task {
  readonly type = "metadata-update";
  readonly silent = false;
  readonly id: string;
  pageProgress?: { completed: number; total: number };
  message = "";
  summary = t("queued");
  candidate?: MetadataCandidate;
  snapshot?: MetadataSnapshot;
  changes: FieldChange[] = [];
  undoChanges: FieldChange[] = [];
  applied = false;
  saving = false;
  executing = false;
  private _attachmentID?: number;
  private controller?: AbortController;
  private stopped = false;
  private _status: TaskStatus = "waiting";
  private listeners = new Set<() => void>();
  constructor(readonly item: Zotero.Item) {
    this.id = `metadata-update-${item.id}`;
    const attachments = this.attachments;
    if (attachments.length === 1) this._attachmentID = attachments[0].id;
    else if (attachments.length > 1) this.summary = t("select-pdf");
  }
  get attachments() {
    return this.item
      .getAttachments()
      .map((id) => Zotero.Items.get(id))
      .filter((item) => item && !item.deleted && item.isPDFAttachment());
  }
  get attachmentID() {
    return this._attachmentID;
  }
  selectAttachment(attachmentID: number): boolean {
    if (
      this.executing ||
      this.saving ||
      attachmentID === this.attachmentID ||
      !this.attachments.some((attachment) => attachment.id === attachmentID)
    )
      return false;
    this._attachmentID = attachmentID;
    this.resetRecognition();
    return true;
  }
  get status() {
    return this._status;
  }
  set status(value: TaskStatus) {
    this._status = value;
    this.notify();
  }
  get canRetry() {
    return !this.executing && !this.saving && this.status !== "waiting";
  }
  get canReview() {
    return (
      this.status === "success" &&
      !this.executing &&
      !this.saving &&
      !!this.snapshot &&
      !!this.candidate &&
      this.candidate.source.attachmentID === this.attachmentID
    );
  }
  get canApply() {
    return (
      this.canReview && !this.applied && this.changes.some((c) => c.selected)
    );
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    addon.data.progress.updateTaskStatus(this, this.status);
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        ztoolkit.log(error);
      }
    }
  }
  addMsg(message: string) {
    this.message += `${this.message ? "\n" : ""}${message}`;
  }
  reportError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    Zotero.debug(error);
    this.addMsg(
      /^metadata-update-[a-z-]+$/.test(message)
        ? getString(message)
        : getString("ai-recognition-failed"),
    );
    this.summary = t("failed");
    this.notify();
  }
  stop() {
    this.stopped = true;
    this.controller?.abort();
    if (this.status === "waiting" || this.status === "processing") {
      this.summary = t("stopped");
      this.status = "paused";
    }
  }
  prepareRetry() {
    if (!this.canRetry) return false;
    this.resetRecognition();
    return true;
  }
  private resetRecognition() {
    this.stopped = false;
    this.pageProgress = undefined;
    this.candidate = undefined;
    this.snapshot = undefined;
    this.changes = [];
    this.undoChanges = [];
    this.applied = false;
    this.message = "";
    this.summary = t("queued");
    this.status = "waiting";
  }
  async run() {
    if (this.executing || this.status !== "waiting" || this.stopped) return;
    // Multiple PDFs require an explicit choice before the first model request.
    // Yield the queue while waiting so this task cannot block other items.
    if (!this.attachmentID && this.attachments.length > 1) {
      this.summary = t("select-pdf");
      this.notify();
      return;
    }
    const attachmentID = this.attachmentID;
    this.executing = true;
    try {
      if (
        this.item.deleted ||
        !this.item.isRegularItem() ||
        !this.item.isEditable()
      )
        throw new Error("metadata-update-unavailable");
      if (!attachmentID) throw new Error("metadata-update-no-pdf");
      const controller: AbortController =
        new (Zotero.getMainWindow().AbortController)();
      this.controller = controller;
      this.snapshot = snapshotItem(this.item);
      this.summary = t("rendering");
      this.status = "processing";
      const candidate = await retrieveFromPDF(attachmentID, this.item.id, {
        signal: controller.signal,
        onProgress: (stage, pages) => {
          if (this.stopped) return;
          this.pageProgress = {
            completed: stage === "complete" ? (pages ?? 0) : 0,
            total: pages ?? 0,
          };
          this.summary =
            stage === "rendering"
              ? t("rendering")
              : getString("metadata-update-recognizing", {
                  args: { pages: pages ?? 0 },
                });
          this.notify();
        },
      });
      if (this.stopped) return;
      const changes = buildChanges(this.snapshot, candidate.metadata);
      this.candidate = candidate;
      this.changes = JSON.parse(JSON.stringify(changes));
      this.summary = changes.length ? t("ready") : t("no-changes");
      this.status = "success";
    } catch (error) {
      if (!this.stopped) {
        this.reportError(error);
        this.status = "fail";
      }
    } finally {
      this.executing = false;
      this.pageProgress = undefined;
      this.controller = undefined;
      this.notify();
    }
  }
  async apply() {
    if (!this.canApply || !this.snapshot) return;
    this.saving = true;
    this.notify();
    try {
      const selected = this.changes
        .filter((c) => c.selected)
        .map((c) => ({ ...c }));
      await applyChanges(this.item.id, this.snapshot, selected);
      this.undoChanges = selected.map((c) => ({
        ...c,
        before: c.after,
        after: c.before,
        selected: true,
      }));
      this.applied = true;
      this.summary = t("saved");
    } finally {
      this.saving = false;
      this.notify();
    }
  }
  async undo() {
    if (!this.canReview || !this.applied || !this.snapshot) return;
    this.saving = true;
    this.notify();
    try {
      await applyChanges(this.item.id, this.snapshot, this.undoChanges);
      this.applied = false;
      this.undoChanges = [];
      this.summary = t("restored");
    } finally {
      this.saving = false;
      this.notify();
    }
  }
}
