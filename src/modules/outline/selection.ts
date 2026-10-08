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
