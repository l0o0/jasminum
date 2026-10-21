import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";
import { addOutlineToReader } from "./index";
import {
  createTreeNodes,
  getOutlineFromPage,
  saveOutlineToJSON,
} from "./outline";
import {
  createBookmarkNodes,
  getBookmarksFromPage,
  saveBookmarksToJSON,
  DEFAULT_BOOKMARK_COLORS,
} from "./bookmark";

type Selection = { text: string; position: PdfPosition["position"] };
type SelectionView = {
  _selectionRanges?: (Selection & { collapsed?: boolean })[];
};

// Capture the active PDF view's selection when the menu opens, before focus changes.
export function getSelectedPDFText(
  reader: _ZoteroTypes.ReaderInstance,
): Selection | null {
  const internal = reader._internalReader as unknown as {
    _lastView?: SelectionView;
  };
  const ranges = internal._lastView?._selectionRanges;
  if (!ranges?.length || ranges[0].collapsed) return null;
  const ordered = [...ranges].sort(
    (a, b) => a.position.pageIndex - b.position.pageIndex,
  );
  return normalizeSelection({
    text: ordered.map((range) => range.text).join(" "),
    position: ordered[0].position,
  });
}

export function normalizeSelection(value: Selection): Selection | null {
  const text = value.text?.replace(/\s+/g, " ").trim();
  const position = value.position;
  const rect = position?.rects?.[0];
  if (
    !text ||
    !Number.isInteger(position?.pageIndex) ||
    position.pageIndex < 0 ||
    !rect ||
    rect.length !== 4 ||
    !rect.every(Number.isFinite)
  )
    return null;
  return {
    text,
    position: { pageIndex: position.pageIndex, rects: [[...rect]] },
  };
}

export async function addSelectionEntry(
  reader: _ZoteroTypes.ReaderInstance,
  selection: Selection,
  kind: "bookmark" | "outline",
) {
  if (!getPref("enableBookmark")) return;
  const snapshot = normalizeSelection(selection);
  if (!snapshot) return;
  reader._internalReader.toggleSidebar(true);
  await addOutlineToReader(reader);
  const doc = reader._iframeWindow!.document;
  const { text, position } = snapshot;
  const [x, , , y] = position.rects[0];
  const location = { title: text, page: position.pageIndex + 1, x, y };
  if (kind === "bookmark") {
    const bookmarks = getBookmarksFromPage(doc);
    const node: BookmarkNode = {
      ...location,
      id: `bookmark_${Zotero.Utilities.randomString()}`,
      order: bookmarks.length,
      createdAt: Date.now(),
      color: DEFAULT_BOOKMARK_COLORS[0],
    };
    await saveBookmarksToJSON(reader._item, [...bookmarks, node]);
    doc.querySelector(".empty-bookmark-prompt")?.remove();
    createBookmarkNodes([node], doc.getElementById("bookmark-root-list")!, doc);
    doc.getElementById("j-bookmark-button")!.click();
  } else {
    const node: OutlineNode = { ...location, level: 1, children: [] };
    await saveOutlineToJSON(reader._item, [...getOutlineFromPage(doc), node]);
    doc.querySelector(".empty-outline-prompt")?.remove();
    createTreeNodes([node], doc.getElementById("root-list")!, doc);
    doc.getElementById("j-outline-button")!.click();
  }
}

export const onSelectionContextMenu: _ZoteroTypes.Reader.EventHandler<
  "createViewContextMenu"
> = ({ reader, append }) => {
  if (
    !getPref("enableBookmark") ||
    reader._item.attachmentContentType !== "application/pdf"
  )
    return;
  const selection = getSelectedPDFText(reader);
  if (!selection) return;
  for (const kind of ["bookmark", "outline"] as const) {
    append({
      label: getString(
        kind === "bookmark"
          ? "selection-add-bookmark"
          : "selection-add-outline",
      ),
      onCommand: () => {
        void addSelectionEntry(reader, selection, kind).catch((error) => {
          ztoolkit.log("Failed to add selected text", error);
          reader._iframeWindow!.alert(getString("selection-add-failed"));
        });
      },
    });
  }
};

let popupIconURL: Promise<string> | undefined;
function getPopupIconURL(): Promise<string> {
  return (popupIconURL ??= Zotero.HTTP.request(
    "GET",
    "chrome://jasminum/content/icons/icon.png",
    { responseType: "arraybuffer", successCodes: [0, 200] },
  )
    .then((response) => {
      const bytes = new Uint8Array(response.response);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return `data:image/png;base64,${Zotero.getMainWindow().btoa(binary)}`;
    })
    .catch((error) => {
      popupIconURL = undefined;
      throw error;
    }));
}

// Keep a snapshot before clicking the popup moves focus away from the PDF.
export const onSelectionPopup: _ZoteroTypes.Reader.EventHandler<
  "renderTextSelectionPopup"
> = ({ reader, doc, append }) => {
  if (
    !getPref("enableBookmark") ||
    reader._item.attachmentContentType !== "application/pdf"
  )
    return;
  const selection = getSelectedPDFText(reader);
  if (!selection) return;
  if (!doc.getElementById("jasminum-selection-actions-style")) {
    const style = doc.createElement("style");
    style.id = "jasminum-selection-actions-style";
    style.textContent = `
      .jasminum-selection-actions button {
        border-radius: 4px;
        transition: background-color 120ms ease;
      }
      .jasminum-selection-actions button:not(:disabled):hover {
        background-color: color-mix(in srgb, currentColor 12%, transparent);
        cursor: pointer;
      }
      .jasminum-selection-actions button:not(:disabled):active {
        background-color: color-mix(in srgb, currentColor 20%, transparent);
      }
      .jasminum-selection-actions button:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 1px;
      }
    `;
    doc.head.append(style);
  }
  const row = doc.createElement("div");
  row.className = "jasminum-selection-actions";
  row.style.cssText =
    "display:flex;align-items:center;gap:6px;padding:4px 6px;";
  const icon = doc.createElement("img");
  icon.style.cssText = "width:18px;height:18px;flex:none;object-fit:contain;";
  void getPopupIconURL()
    .then((url) => {
      icon.src = url;
    })
    .catch((error) => {
      ztoolkit.log("Unable to load selection popup icon", error);
    });
  icon.alt = "茉莉花";
  icon.title = "Jasminum";
  icon.width = 18;
  icon.height = 18;
  row.append(icon);
  for (const kind of ["bookmark", "outline"] as const) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = getString(`selection-popup-add-${kind}`);
    button.title = getString(`selection-add-${kind}`);
    button.style.cssText = "width:auto;padding:4px 6px;white-space:nowrap;";
    button.addEventListener("click", () => {
      button.disabled = true;
      void addSelectionEntry(reader, selection, kind).catch((error) => {
        button.disabled = false;
        ztoolkit.log("Failed to add selected text", error);
        reader._iframeWindow!.alert(getString("selection-add-failed"));
      });
    });
    row.append(button);
  }
  append(row);
};
