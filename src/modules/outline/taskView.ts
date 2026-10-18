import { setOutlineButtonIcon } from "./buttonIcon";
import { openOutlineReview, closeOutlineReviews } from "./reviewView";
import { getString } from "../../utils/locale";
import { OutlineTask } from "./task";

const t = (key: string) => getString(`outline-ai-${key}`);
export function stopOutlineTasks() {
  closeOutlineReviews();
  for (const task of addon.taskRunner.tasks)
    if (task instanceof OutlineTask) task.stop();
}
export async function openOutlineTask(item: Zotero.Item) {
  await addon.data.progress.openProgressWindow();
  const doc = addon.data.progress.progressWindow?.document;
  if (!doc) return;
  const focusTask = (id: number) => {
    const node = doc.getElementById(`task-header-outline-${id}`);
    node?.scrollIntoView({ block: "nearest" });
    return !!node;
  };
  const attachment = item.isPDFAttachment()
    ? item
    : item.isRegularItem()
      ? (await item.getBestAttachments()).find(
          (a) => a.isPDFAttachment() && !a.deleted,
        )
      : undefined;
  const target = attachment ?? item;
  const existing = addon.taskRunner.getTaskById(`outline-${target.id}`);
  if (existing) {
    focusTask(target.id);
    if (existing instanceof OutlineTask && existing.canResume)
      await addon.taskRunner.retryOutlineTask(existing);
    return;
  }
  await addon.taskRunner.addTask(
    addon.taskRunner.createTask(target, "outline"),
  );
}

export function addOutlineControls(task: OutlineTask, row: Element) {
  const doc = row.ownerDocument;
  const title = row.querySelector(".task-title");
  title?.prepend(`${t("title")} · `);
  const progress = doc.createElement("span");
  progress.id = `outline-progress-${task.id}`;
  progress.style.cssText =
    "margin-inline-start:10px;font-variant-numeric:tabular-nums;font-weight:normal;white-space:nowrap";
  progress.setAttribute("role", "status");
  title?.append(progress);
  const controls = doc.createElement("span");
  controls.style.cssText =
    "display:flex;align-items:center;gap:8px;margin-inline-start:auto";
  for (const action of ["stop", "continue", "review-open"] as const) {
    const button = doc.createElement("button");
    button.id = `outline-${action}-${task.id}`;
    button.textContent = action === "stop" ? "" : t(action);
    if (action === "stop") {
      setOutlineButtonIcon(button, "stop");
      button.className = "outline-stop";
      button.title = t("stop");
      button.setAttribute("aria-label", t("stop"));
      button.style.cssText =
        "width:28px;height:28px;padding:0;font-size:14px;line-height:1;border-radius:5px;appearance:none;border:0;box-shadow:none;background:transparent;color:inherit";
    }
    button.onclick = async (event) => {
      event.stopPropagation();
      try {
        if (action === "stop") task.stop();
        else if (action === "continue")
          await addon.taskRunner.retryOutlineTask(task);
        else openOutlineReview(task);
      } catch (error) {
        task.reportError(error);
      }
    };
    controls.append(button);
  }
  row.querySelector(`#task-header-${task.id}`)?.append(controls);
}
export function updateOutlineControls(task: OutlineTask, doc: Document) {
  const progress = doc.getElementById(`outline-progress-${task.id}`);
  if (progress)
    progress.textContent = task.totalPages
      ? `${task.status === "processing" ? Math.min(task.completedPages + 1, task.totalPages) : task.completedPages}/${task.totalPages}`
      : "0/—";
  const enabled = {
    stop: ["processing", "waiting"].includes(task.status),
    continue: task.canResume,
    "review-open": !!task.headings.length || task.applied,
  };
  for (const [action, value] of Object.entries(enabled)) {
    const button = doc.getElementById(
      `outline-${action}-${task.id}`,
    ) as HTMLButtonElement | null;
    if (button) {
      button.hidden = !value;
      button.disabled = !value;
    }
  }
}
