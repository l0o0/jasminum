import {
  equalValue,
  metadataFields,
  type FieldChange,
  type MetadataSnapshot,
  type FieldValue,
} from "./diff";
import type { ZoteroCreator } from "../../utils/pdfMetadata";

export function snapshotItem(item: Zotero.Item): MetadataSnapshot {
  const fields: Record<string, FieldValue> = {};
  for (const field of metadataFields) {
    if (field === "creators")
      fields[field] = item.getCreatorsJSON() as ZoteroCreator[];
    else if (
      Zotero.ItemFields.isValidForType(
        Zotero.ItemFields.getID(field),
        item.itemTypeID,
      )
    ) {
      fields[field] = String(item.getField(field) || "");
    }
  }
  return { itemType: Zotero.ItemTypes.getName(item.itemTypeID), fields };
}

export async function applyChanges(
  itemID: number,
  snapshot: MetadataSnapshot,
  changes: FieldChange[],
): Promise<void> {
  const selected = changes.filter((c) => c.selected);
  if (!selected.length) return;
  const item = Zotero.Items.get(itemID);
  let mutated = false;
  try {
    await Zotero.DB.executeTransaction(async () => {
      if (!item || item.deleted || !item.isRegularItem() || !item.isEditable())
        throw new Error("metadata-update-unavailable");
      const current = snapshotItem(item);
      if (
        current.itemType !== snapshot.itemType ||
        selected.some(
          (c) =>
            !metadataFields.includes(
              c.field as (typeof metadataFields)[number],
            ) ||
            !(c.field in current.fields) ||
            !equalValue(current.fields[c.field], c.before),
        )
      )
        throw new Error("metadata-update-stale");
      mutated = true;
      for (const change of selected) {
        if (change.field === "creators")
          item.setCreators(
            change.after as Parameters<Zotero.Item["setCreators"]>[0],
          );
        else item.setField(change.field, change.after as string);
      }
      await item.save();
      const undo = (
        Zotero as unknown as {
          UndoHistory?: {
            stageAction(action: string, args: { count: number }): void;
          };
        }
      ).UndoHistory;
      undo?.stageAction("undo-action-edit-metadata", { count: 1 });
    });
  } catch (error) {
    if (item && mutated)
      await item.reload(["primaryData", "itemData", "creators"], true);
    throw error;
  }
}
