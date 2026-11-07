import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import type { FieldValue } from "./diff";
import type { MetadataTask } from "./task";

const windows = new Map<number, Window>();
const text = (key: string) => getString(`metadata-update-${key}`);
export function closeMetadataUpdates(): void {
  for (const win of windows.values()) if (!win.closed) win.close();
  windows.clear();
}
export function openMetadataReview(task: MetadataTask): void {
  const candidate = task.candidate;
  if (!task.canReview || !candidate) return;
  const existing = windows.get(task.item.id);
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }
  const win = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/metadata-update.xhtml`,
    "_blank",
    "chrome,centerscreen,resizable,width=850,height=650",
    {
      init: (win: Window) => {
        if (!task.canReview || task.candidate !== candidate) {
          win.close();
          if (windows.get(task.item.id) === win) windows.delete(task.item.id);
          return;
        }
        initialize(win, task);
      },
    },
  );
  if (win) windows.set(task.item.id, win);
}
function initialize(win: Window, task: MetadataTask): void {
  const doc = win.document;
  const candidate = task.candidate!;
  doc.title = text("review-title");
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
  element("h1", text("review-title"));
  element("p", String(task.item.getField("title")));
  const panel = element("div");
  panel.className = "panel";
  panel.id = "changes";

  const table = element("table", "", panel);
  const header = element("tr", "", element("thead", "", table));
  for (const heading of ["", text("field"), text("before"), text("after")])
    element("th", heading, header);
  const body = element("tbody", "", table);
  const status = element("p");
  status.id = "status";
  status.setAttribute("role", "status");
  const actions = element("div");
  actions.id = "actions";
  const bulk = element("div", "", actions);
  bulk.className = "bulk-actions";
  const all = element("button", text("select-all"), bulk);
  const empty = element("button", text("empty-only"), bulk);
  const undo = element("button", text("undo"), actions);
  const close = element("button", text("close"), actions);
  const apply = element("button", text("save"), actions);
  apply.className = "primary";
  const checks: HTMLInputElement[] = [];
  const describe = (value: FieldValue) =>
    typeof value === "string"
      ? value
      : value
          .map(
            (c) =>
              `${"name" in c ? c.name : [`${text("lastName")}: ${c.lastName}`, `${text("firstName")}: ${c.firstName}`].join(" · ")} (${Zotero.CreatorTypes.getLocalizedString(c.creatorType)})`,
          )
          .join("\n");
  for (const change of task.changes) {
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
      task.notify();
    };
    checks.push(checkbox);
    element("td", name, row);
    element("td", describe(change.before) || "—", row);
    const value = element("td", "", row);
    if (typeof change.after === "string") {
      const editor = element("textarea", "", value);
      editor.value = change.after;
      editor.rows = change.field === "abstractNote" ? 5 : 1;
      editor.setAttribute("aria-label", name);
      editor.oninput = () => {
        change.after = editor.value;
        change.selected = checkbox.checked = true;
        task.notify();
      };
    } else {
      for (const creator of change.after) {
        const creatorRow = element("div", "", value);
        creatorRow.className = "creator-editor";
        const roleLabel = element("div", "", creatorRow);
        roleLabel.className = "creator-role";
        element("span", text("creator-role"), roleLabel);
        const role = element(
          "button",
          Zotero.CreatorTypes.getLocalizedString(creator.creatorType),
          roleLabel,
        );
        role.className = "role-trigger";
        role.setAttribute("aria-label", text("creator-role"));
        role.setAttribute("aria-haspopup", "true");
        role.setAttribute("aria-expanded", "false");
        const popup = element("div", "", roleLabel);
        popup.className = "role-popup";
        popup.hidden = true;
        const closeRole = () => {
          popup.hidden = true;
          role.setAttribute("aria-expanded", "false");
        };
        role.onclick = () => {
          popup.hidden = !popup.hidden;
          if (!popup.hidden) {
            const rect = role.getBoundingClientRect();
            popup.style.left = `${Math.max(8, Math.min(rect.left, win.innerWidth - popup.offsetWidth - 8))}px`;
            popup.style.top = `${Math.max(8, Math.min(rect.bottom + 4, win.innerHeight - popup.offsetHeight - 8))}px`;
          }
          role.setAttribute("aria-expanded", String(!popup.hidden));
          if (!popup.hidden)
            popup
              .querySelector<HTMLButtonElement>("button[aria-pressed='true']")
              ?.focus();
        };
        for (const type of Zotero.CreatorTypes.getTypesForItemType(
          task.item.itemTypeID,
        )) {
          const option = element(
            "button",
            Zotero.CreatorTypes.getLocalizedString(type.name),
            popup,
          );
          option.setAttribute(
            "aria-pressed",
            String(type.name === creator.creatorType),
          );
          option.onclick = () => {
            creator.creatorType = type.name;
            role.textContent = option.textContent;
            for (const sibling of popup.querySelectorAll("button"))
              (sibling as HTMLButtonElement).setAttribute(
                "aria-pressed",
                String(sibling === option),
              );
            closeRole();
            role.focus();
            change.selected = checkbox.checked = true;
            task.notify();
          };
        }
        doc.addEventListener("click", (event) => {
          if (!roleLabel.contains(event.target as Node)) closeRole();
        });
        roleLabel.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeRole();
            role.focus();
            event.stopPropagation();
          }
          if (!popup.hidden && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            const buttons = Array.from(
              popup.querySelectorAll("button"),
            ) as HTMLButtonElement[];
            const index = buttons.indexOf(
              doc.activeElement as HTMLButtonElement,
            );
            buttons[
              (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length
            ]?.focus();
          }
        });
        const keys =
          "name" in creator
            ? (["name"] as const)
            : (["lastName", "firstName"] as const);
        for (const key of keys) {
          const label = element("label", text(key), creatorRow);
          label.className = "creator-name";
          const input = element("input", "", label);
          input.type = "text";
          input.value =
            key === "name" && "name" in creator
              ? creator.name
              : key === "firstName" && "firstName" in creator
                ? creator.firstName
                : "lastName" in creator
                  ? creator.lastName
                  : "";
          input.placeholder = text(key);
          input.setAttribute("aria-label", `${name}: ${text(key)}`);
          input.oninput = () => {
            if (key === "name" && "name" in creator) creator.name = input.value;
            if (key === "firstName" && "firstName" in creator)
              creator.firstName = input.value;
            if (key === "lastName" && "lastName" in creator)
              creator.lastName = input.value;
            change.selected = checkbox.checked = true;
            task.notify();
          };
        }
      }
    }
    value.title = candidate.evidence
      .filter((e) => e.field === change.field)
      .map((e) => `${text("page")} ${e.page}: ${e.text}`)
      .join("\n");
  }
  const choose = (onlyEmpty: boolean) => {
    task.changes.forEach((c, i) => {
      c.selected = !onlyEmpty || c.before.length === 0;
      checks[i].checked = c.selected;
    });
    task.notify();
  };
  all.onclick = () => choose(false);
  empty.onclick = () => choose(true);
  close.onclick = () => win.close();
  apply.onclick = async () => {
    if (!task.canApply || task.candidate !== candidate) return;
    try {
      await task.apply();
      if (task.applied) win.close();
    } catch (error) {
      task.reportError(error);
    }
  };
  undo.onclick = async () => {
    if (task.candidate !== candidate) return;
    try {
      await task.undo();
    } catch (error) {
      task.reportError(error);
    }
  };
  const update = () => {
    if (win.closed) return;
    if (task.candidate !== candidate) {
      win.close();
      return;
    }
    status.textContent = task.message
      ? `${task.summary}\n${task.message}`
      : task.summary;
    apply.disabled = !task.canApply;
    undo.hidden = !task.applied;
    undo.disabled = task.saving;
    all.disabled = empty.disabled = task.saving || task.applied;
    for (const input of panel.querySelectorAll<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLButtonElement
      | HTMLSelectElement
    >("input,textarea,button,select"))
      (input as HTMLInputElement).disabled = task.saving || task.applied;
  };
  const unsubscribe = task.subscribe(update);
  win.addEventListener(
    "unload",
    () => {
      unsubscribe();
      if (windows.get(task.item.id) === win) windows.delete(task.item.id);
    },
    { once: true },
  );
  update();
}
