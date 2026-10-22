import { setOutlineButtonIcon } from "./buttonIcon";
import { getString } from "../../utils/locale";
import type { OutlineTask } from "./task";
const t = (key: string) => getString(`outline-ai-${key}`);
const windows = new Map<string, Window>();
function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
): HTMLElementTagNameMap[K] {
  return doc.createElementNS(
    "http://www.w3.org/1999/xhtml",
    tag,
  ) as HTMLElementTagNameMap[K];
}
export function closeOutlineReviews() {
  for (const win of windows.values()) if (!win.closed) win.close();
  windows.clear();
}
export function openOutlineReview(task: OutlineTask) {
  const existing = windows.get(task.id);
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }
  const win = Zotero.getMainWindow().openDialog(
    "chrome://jasminum/content/outline-review.xhtml",
    "_blank",
    "chrome,centerscreen,resizable,width=820,height=640",
    { init: (win: Window) => initialize(win, task) },
  );
  if (win) {
    windows.set(task.id, win);
    win.addEventListener("unload", () => windows.delete(task.id), {
      once: true,
    });
  }
}
function initialize(win: Window, task: OutlineTask) {
  const doc = win.document;
  doc.title = t("review-window-title");
  doc.getElementById("title")!.textContent = t("review-title");
  doc.getElementById("edit-hint")!.textContent = t("edit-hint");
  doc.getElementById("results")!.id = `outline-results-${task.id}`;
  const actions = doc.getElementById("actions")!;
  for (const action of ["restart", "undo", "close", "apply"] as const) {
    const button = element(doc, "button");
    button.id = action;
    button.textContent = t(action === "apply" ? "save-outline" : action);
    button.title = t(action);
    button.className =
      action === "apply"
        ? "primary"
        : action === "close"
          ? "secondary"
          : "quiet";
    button.onclick = async () => {
      try {
        if (action === "apply") {
          if (!task.canApply) return;
          await task.apply();
          if (task.applied) win.close();
        } else if (action === "undo") await task.undo();
        else if (action === "restart")
          await addon.taskRunner.retryOutlineTask(task);
        else win.close();
      } catch (error) {
        task.reportError(error);
      }
    };
    actions.append(button);
  }
  const update = () => {
    doc.getElementById("status")!.textContent = task.summary;
    (doc.getElementById("apply") as HTMLButtonElement).disabled =
      !task.canApply;
    (doc.getElementById("undo") as HTMLButtonElement).hidden = !task.applied;
    (doc.getElementById("undo") as HTMLButtonElement).disabled = task.saving;
    (doc.getElementById("restart") as HTMLButtonElement).disabled =
      !task.canRestart;
    renderOutlineReview(task, doc);
  };
  const unsubscribe = task.subscribe(update);
  win.addEventListener("unload", unsubscribe, { once: true });
  update();
}
export function renderOutlineReview(task: OutlineTask, doc: Document) {
  const preview = doc.getElementById(`outline-results-${task.id}`);
  if (
    !preview ||
    preview.getAttribute("data-count") ===
      `${task.headings.length}:${task.previewRevision}:${task.canEdit}`
  )
    return;
  preview.setAttribute(
    "data-count",
    `${task.headings.length}:${task.previewRevision}:${task.canEdit}`,
  );
  preview.replaceChildren();
  let draggedIndex: number | undefined;
  const focusHeading = (index: number) => {
    const target = preview.querySelector<HTMLButtonElement>(
      `[data-heading-index="${index}"]`,
    );
    if (target) {
      target.focus();
      target.scrollIntoView({ block: "nearest" });
    } else preview.focus();
  };
  const clearDrop = () =>
    preview
      .querySelectorAll<HTMLElement>("[data-heading-index]")
      .forEach((node) => {
        node.style.borderTopColor = "transparent";
        node.style.borderBottomColor = "transparent";
      });
  task.headings.forEach((h, index) => {
    const button = element(doc, "button");
    button.className = "outline-row";
    const title = element(doc, "span");
    title.className = "outline-heading";
    title.style.paddingInlineStart = `${(h.level - 1) * 22}px`;
    title.textContent = h.title;
    for (let level = 1; level < h.level; level++) {
      const guide = element(doc, "span");
      guide.className = "outline-guide";
      guide.style.insetInlineStart = `${(level - 1) * 22 + 6}px`;
      guide.setAttribute("aria-hidden", "true");
      if (level === h.level - 1) guide.classList.add("outline-guide-branch");
      title.append(guide);
    }
    const confidence = element(doc, "span");
    confidence.className = `outline-confidence ${h.exact ? "exact" : "approx"}`;
    setOutlineButtonIcon(confidence, "info");
    confidence.title = t(h.exact ? "exact-tip" : "approx-tip");
    confidence.setAttribute("aria-label", confidence.title);
    const page = element(doc, "input");
    page.className = "outline-page";
    page.type = "number";
    page.min = "1";
    page.max = String(task.totalPages);
    page.step = "1";
    page.value = String(h.page);
    page.disabled = !task.canEdit;
    page.onchange = async () => {
      const value = page.valueAsNumber;
      if (!Number.isInteger(value) || value < 1 || value > task.totalPages) {
        page.value = String(h.page);
        return;
      }
      page.disabled = true;
      try {
        await task.changeHeadingPage(index, value);
      } catch (error) {
        task.reportError(error);
      } finally {
        page.value = String(h.page);
        page.disabled = !task.canEdit;
      }
    };
    page.onkeydown = (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        page.blur();
      }
      if (event.key === "Escape") {
        page.value = String(h.page);
        page.blur();
      }
    };
    page.title = t("edit-page");
    page.setAttribute("aria-label", page.title);
    button.append(title, confidence);
    button.dataset.headingIndex = String(index);
    button.setAttribute(
      "aria-keyshortcuts",
      "Delete Backspace ArrowUp ArrowDown ArrowLeft ArrowRight",
    );
    button.onkeydown = (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        ![
          "Delete",
          "Backspace",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        focusHeading(
          Math.max(
            0,
            Math.min(
              task.headings.length - 1,
              index + (event.key === "ArrowUp" ? -1 : 1),
            ),
          ),
        );
      } else if (task.canEdit) focusHeading(task.editHeading(index, event.key));
    };
    button.draggable = task.canEdit;
    button.ondragstart = (event) => {
      if (!task.canEdit || !event.dataTransfer) {
        event.preventDefault();
        return;
      }
      draggedIndex = index;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    };
    button.ondragover = (event) => {
      if (draggedIndex === undefined || !task.canEdit) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      clearDrop();
      const rect = button.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      button.style[before ? "borderTopColor" : "borderBottomColor"] = "#2684ff";
    };
    button.ondrop = (event) => {
      if (draggedIndex === undefined || !task.canEdit) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = button.getBoundingClientRect();
      const slot = index + (event.clientY < rect.top + rect.height / 2 ? 0 : 1);
      const from = draggedIndex;
      draggedIndex = undefined;
      clearDrop();
      focusHeading(task.moveHeading(from, slot));
    };
    button.ondragend = () => {
      draggedIndex = undefined;
      clearDrop();
    };
    button.onclick = () => button.focus();
    const row = element(doc, "div");
    row.className = "outline-entry";
    const jump = element(doc, "button");
    jump.className = "outline-jump";
    setOutlineButtonIcon(jump, "open-pdf");
    jump.title = t("jump");
    jump.setAttribute(
      "aria-label",
      `${t("jump")} · ${h.title} · ${t("page")} ${h.page}`,
    );
    jump.onclick = async (event) => {
      event.stopPropagation();
      jump.disabled = true;
      try {
        await task.navigate(index);
      } catch (error) {
        task.reportError(error);
      } finally {
        jump.disabled = false;
      }
    };
    const pageField = element(doc, "label");
    pageField.className = "outline-page-field";
    const pageLabel = element(doc, "span");
    pageLabel.textContent = t("page");
    pageField.append(pageLabel, page);
    row.append(button, pageField, jump);
    for (const [key, label] of [
      ["ArrowLeft", "promote"],
      ["ArrowRight", "demote"],
    ]) {
      const levelButton = element(doc, "button");
      levelButton.className = "outline-jump";
      setOutlineButtonIcon(levelButton, "level", key === "ArrowLeft");
      levelButton.title = t(label);
      levelButton.setAttribute("aria-label", `${t(label)} · ${h.title}`);
      levelButton.disabled =
        !task.canEdit || (key === "ArrowLeft" ? h.level <= 1 : h.level >= 7);
      levelButton.onclick = (event) => {
        event.stopPropagation();
        focusHeading(task.editHeading(index, key));
      };
      row.append(levelButton);
    }
    preview.append(row);
  });
}
