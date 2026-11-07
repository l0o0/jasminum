import { getString } from "../../utils/locale";
import { setOutlineButtonIcon } from "../outline/buttonIcon";
import { MetadataTask } from "./task";
import { openMetadataReview } from "./updateDialog";
const t = (key: string) => getString(`metadata-update-${key}`);

export async function openMetadataUpdate(item: Zotero.Item): Promise<void> {
  if (!item.isRegularItem() || !item.isEditable() || item.deleted) return;
  const existing = addon.taskRunner.getTaskById(`metadata-update-${item.id}`);
  if (existing) {
    await addon.data.progress.openProgressWindow();
    addon.data.progress.progressWindow?.document
      .getElementById(`task-header-${existing.id}`)
      ?.scrollIntoView({ block: "nearest" });
    return;
  }
  await addon.taskRunner.addTask(new MetadataTask(item));
}
export function addMetadataControls(task: MetadataTask, row: Element) {
  const doc = row.ownerDocument;
  row.querySelector(".task-title")?.prepend(`${t("title")} · `);
  const controls = doc.createElement("span");
  controls.style.cssText = "display:flex;gap:8px;align-items:center";
  for (const action of ["stop", "retry", "review-open"] as const) {
    const button = doc.createElement("button");
    button.id = `metadata-${action}-${task.id}`;
    button.textContent = t(action);
    if (action === "stop") {
      setOutlineButtonIcon(button, "stop");
      button.className = "outline-stop";
      button.style.cssText =
        "width:28px;height:28px;padding:0;appearance:none;border:0;box-shadow:none;background:transparent;color:inherit";
    }
    button.title = t(action);
    button.setAttribute("aria-label", t(action));
    button.onclick = async (event) => {
      event.stopPropagation();
      try {
        if (action === "stop") task.stop();
        else if (action === "retry")
          await addon.taskRunner.retryMetadataTask(task);
        else openMetadataReview(task);
      } catch (error) {
        task.reportError(error);
      }
    };
    controls.append(button);
  }
  const header = row.querySelector(`#task-header-${task.id}`);
  header?.append(controls);
  const attachments = task.attachments;
  if (attachments.length > 1) {
    const label = doc.createElement("label");
    label.textContent = t("pdf");
    const select = doc.createElement("select");
    select.id = `metadata-pdf-${task.id}`;
    const placeholder = doc.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("select-pdf");
    placeholder.disabled = true;
    select.append(placeholder);
    for (const attachment of attachments) {
      const option = doc.createElement("option");
      option.value = String(attachment.id);
      option.textContent =
        String(attachment.getField("title")) || attachment.attachmentFilename;
      select.append(option);
    }
    select.value = task.attachmentID ? String(task.attachmentID) : "";
    select.onchange = async () => {
      if (!task.selectAttachment(Number(select.value))) {
        select.value = task.attachmentID ? String(task.attachmentID) : "";
        return;
      }
      try {
        await addon.taskRunner.runTask(task);
      } catch (error) {
        task.reportError(error);
      }
    };
    label.append(select);
    row.append(label);
  }
}
export function updateMetadataControls(task: MetadataTask, doc: Document) {
  const enabled = {
    stop: ["waiting", "processing"].includes(task.status),
    retry: task.canRetry,
    "review-open": task.canReview,
  };
  for (const [action, value] of Object.entries(enabled)) {
    const button = doc.getElementById(
      `metadata-${action}-${task.id}`,
    ) as HTMLButtonElement | null;
    if (button) button.hidden = button.disabled = !value;
  }
  const select = doc.getElementById(
    `metadata-pdf-${task.id}`,
  ) as HTMLSelectElement | null;
  if (select) select.disabled = task.executing || task.saving;
}
