import type { ScraperTask } from "../../utils/task";

async function fixArticleMetadata(
  item: Zotero.Item,
  result: ScrapeSearchResult,
): Promise<void> {
  if (result.citation)
    ztoolkit.ExtraField.setExtraField(item, "CNKICite", `${result.citation}`);
  if (result.netFirst)
    ztoolkit.ExtraField.setExtraField(
      item,
      "Status",
      "advance online publication",
    );
  if (!item.getField("date") && result.date) item.setField("date", result.date);
  // These notes contain unmatched fields from article import formats.
  for (const id of item.getNotes()) await Zotero.Items.get(id).erase();
}

/** Commit metadata and the original item's association in one transaction. */
export async function saveMetadataItem(
  task: ScraperTask,
  newItem: Zotero.Item,
  result?: ScrapeSearchResult,
): Promise<void> {
  const item = task.item;
  const originalParentID = item.parentID;
  const originalItemTypeID = item.itemTypeID;
  const oldParent = task.type === "snapshot" ? item.parentItem : undefined;
  const existingNewItem = !!newItem.id;
  let modified = false;
  try {
    await Zotero.DB.executeTransaction(async () => {
      if (
        task.cancelled ||
        item.deleted ||
        !item.isEditable() ||
        item.parentID !== originalParentID ||
        (task.type !== "snapshot" && !item.isTopLevelItem())
      )
        throw new Error(
          "The original item is unavailable for metadata import.",
        );
      if (result && task.type !== "book" && !oldParent) {
        for (const id of item.getCollections()) newItem.addToCollection(id);
      } else newItem.setCollections((oldParent || item).getCollections());
      if (result) {
        if (Zotero.Prefs.get("automaticTags"))
          newItem.setTags(
            newItem
              .getTags()
              .map((tag: { tag: string }) => ({ tag: tag.tag, type: 1 })),
          );
        else newItem.removeAllTags();
        if (task.type !== "book") await fixArticleMetadata(newItem, result);
      }
      await newItem.save();
      if (task.cancelled) throw new Error("Metadata import cancelled.");
      modified = true;
      if (task.type === "snapshot" && item.isTopLevelItem()) {
        item.fromJSON(newItem.toJSON());
        await item.save();
        await newItem.erase();
      } else {
        item.parentID = newItem.id;
        await item.save();
        if (oldParent) await oldParent.erase();
      }
      if (task.cancelled) throw new Error("Metadata import cancelled.");
    });
  } catch (error) {
    if (modified) {
      if (item.itemTypeID !== originalItemTypeID)
        item.setType(originalItemTypeID);
      const dataTypes =
        task.type === "snapshot"
          ? ["primaryData", "itemData", "creators", "tags", "collections"]
          : ["primaryData"];
      await item.reload(dataTypes, true);
    }
    // Saving or erasing a child refreshes these caches before the transaction commits.
    if (oldParent) await oldParent.reload(["primaryData", "childItems"], true);
    if (existingNewItem)
      await newItem.reload(["primaryData", "childItems"], true);
    throw error;
  }
}
