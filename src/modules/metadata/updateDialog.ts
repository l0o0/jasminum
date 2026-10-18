import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { buildChanges, type FieldChange, type FieldValue } from "./diff";
import { applyChanges, snapshotItem } from "./apply";
import { retrieveFromPDF } from "./retrieve";

const windows = new Map<number, Window>();
const text = (key: string) => getString(`metadata-update-${key}`);

export function closeMetadataUpdates(): void {
  for (const win of windows.values()) if (!win.closed) win.close();
  windows.clear();
}

export function openMetadataUpdate(item: Zotero.Item): void {
  const existing = windows.get(item.id);
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }
  if (!item.isRegularItem() || !item.isEditable() || item.deleted) return;
  const win = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/metadata-update.xhtml`,
    "_blank",
    "chrome,centerscreen,resizable,width=850,height=650",
    { init: (win: Window) => initialize(win, item) },
  );
  if (win) {
    windows.set(item.id, win);
    win.addEventListener("unload", () => windows.delete(item.id), {
      once: true,
    });
  }
}

function initialize(win: Window, item: Zotero.Item): void {
  const doc = win.document;
  doc.title = text("title");
  const root = doc.getElementById("root")!;
  function element<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    content = "",
    parent: Element = root,
  ): HTMLElementTagNameMap[K] {
    const el = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      tag,
    ) as HTMLElementTagNameMap[K];
    el.textContent = content;
    parent.append(el);
    return el;
  }
  element("h1", text("title"));
  element("p", String(item.getField("title")));
  element("p", text("description"));
  const label = element("label", text("pdf"));
  const select = element("select", "", label);
  for (const id of item.getAttachments()) {
    const attachment = Zotero.Items.get(id);
    if (!attachment.deleted && attachment.isPDFAttachment()) {
      const option = element(
        "option",
        String(attachment.getField("title")) || attachment.attachmentFilename,
        select,
      );
      option.value = String(id);
    }
  }
  element("br");
  const fetchButton = element("button", text("fetch"));
  const status = element("p");
  status.id = "status";
  status.setAttribute("role", "status");
  const panel = element("div");
  panel.className = "panel";
  panel.hidden = true;
  panel.id = "changes";
  const applyButton = element("button", text("apply"));
  const undoButton = element("button", text("undo"));
  const close = element("button", text("close"));
  close.onclick = () => win.close();
  applyButton.disabled = undoButton.disabled = true;
  let snapshot = snapshotItem(item);
  let changes: FieldChange[] = [];
  let undoChanges: FieldChange[] = [];
  const describe = (value: FieldValue) =>
    typeof value === "string"
      ? value
      : value
          .map(
            (c) =>
              `${"name" in c ? c.name : [c.firstName, c.lastName].filter(Boolean).join(" ")} (${Zotero.CreatorTypes.getLocalizedString(c.creatorType)})`,
          )
          .join("\n");
  function errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.startsWith("metadata-update-")
      ? getString(message)
      : message;
  }
  function refreshApply() {
    applyButton.disabled = !changes.some((c) => c.selected);
  }
  function render(candidate: Awaited<ReturnType<typeof retrieveFromPDF>>) {
    panel.replaceChildren();
    panel.hidden = false;
    element("p", text("source"), panel);
    const all = element("button", text("select-all"), panel);
    const empty = element("button", text("empty-only"), panel);
    const table = element("table", "", panel);
    const header = element("tr", "", element("thead", "", table));
    for (const heading of ["", text("field"), text("before"), text("after")])
      element("th", heading, header);
    const body = element("tbody", "", table);
    const checks: HTMLInputElement[] = [];
    for (const change of changes) {
      const row = element("tr", "", body);
      const checkbox = element("input", "", element("td", "", row));
      checkbox.type = "checkbox";
      checkbox.checked = change.selected;
      const name =
        change.field === "creators"
          ? text("creators")
          : Zotero.ItemFields.getLocalizedString(change.field);
      checkbox.setAttribute("aria-label", name);
      checkbox.onchange = () => {
        change.selected = checkbox.checked;
        refreshApply();
      };
      checks.push(checkbox);
      element("td", name, row);
      element("td", describe(change.before) || "—", row);
      const value = element("td", describe(change.after), row);
      const evidence = candidate.evidence.filter(
        (e) => e.field === change.field,
      );
      if (evidence.length)
        value.title = evidence
          .map((e) => `${text("page")} ${e.page}: ${e.text}`)
          .join("\n");
    }
    const choose = (onlyEmpty: boolean) => {
      changes.forEach((c, i) => {
        c.selected = !onlyEmpty || c.before.length === 0;
        checks[i].checked = c.selected;
      });
      refreshApply();
    };
    all.onclick = () => choose(false);
    empty.onclick = () => choose(true);
    refreshApply();
  }
  if (!select.options.length) {
    fetchButton.disabled = true;
    status.textContent = text("no-pdf");
  }
  fetchButton.onclick = async () => {
    fetchButton.disabled = select.disabled = true;
    applyButton.disabled = undoButton.disabled = true;
    panel.hidden = true;
    changes = [];
    undoChanges = [];
    status.textContent = text("loading");
    try {
      snapshot = snapshotItem(item);
      const candidate = await retrieveFromPDF(Number(select.value), item.id);
      if (win.closed || !addon.data.alive) return;
      changes = buildChanges(snapshot, candidate.metadata);
      render(candidate);
      status.textContent = changes.length ? text("review") : text("no-changes");
    } catch (error) {
      if (!win.closed) status.textContent = errorMessage(error);
    } finally {
      if (!win.closed) fetchButton.disabled = select.disabled = false;
    }
  };
  applyButton.onclick = async () => {
    applyButton.disabled = fetchButton.disabled = true;
    try {
      // Freeze the selected patch before awaiting the transaction.
      const selected = changes.filter((c) => c.selected).map((c) => ({ ...c }));
      await applyChanges(item.id, snapshot, selected);
      if (win.closed) return;
      undoChanges = selected.map((c) => ({
        ...c,
        before: c.after,
        after: c.before,
        selected: true,
      }));
      panel.hidden = true;
      status.textContent = text("saved");
      undoButton.disabled = !undoChanges.length;
    } catch (error) {
      if (!win.closed) status.textContent = errorMessage(error);
    } finally {
      if (!win.closed) fetchButton.disabled = false;
    }
  };
  undoButton.onclick = async () => {
    undoButton.disabled = fetchButton.disabled = true;
    try {
      await applyChanges(item.id, snapshot, undoChanges);
      if (win.closed) return;
      status.textContent = text("restored");
      undoChanges = [];
    } catch (error) {
      if (!win.closed) status.textContent = errorMessage(error);
    } finally {
      if (!win.closed) fetchButton.disabled = false;
    }
  };
}
