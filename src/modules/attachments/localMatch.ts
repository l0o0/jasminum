import { compareTwoStrings } from "string-similarity";
import { getPref } from "../../utils/prefs";
import { isChineseAttachmentFilename } from "../../utils/detect";

// Return full path of the attachments.
export async function findAttachmentsInFolder(
  folder?: string,
): Promise<string[]> {
  if (!folder) folder = getPref("pdfMatchFolder");
  ztoolkit.log(folder);
  return (await IOUtils.getChildren(folder)).filter((filename) => {
    ztoolkit.log(filename);
    return isChineseAttachmentFilename(PathUtils.filename(filename));
  });
}

export class LocalAttachmentService implements AttachmentService {
  async searchAttachments(
    task: AttachmentTask,
  ): Promise<AttachmentSearchResult[] | null> {
    ztoolkit.log("Searching for local attachments...");
    const threshold = parseFloat(getPref("similarityThreshold"));
    const top = getPref("topMatchCount");
    const searchString = task.item.getField("title");
    const attachmentFilenames = await findAttachmentsInFolder();
    ztoolkit.log(attachmentFilenames);
    if (!attachmentFilenames || attachmentFilenames.length === 0) {
      return null;
    }

    // 创建包含评分和文件名的对象数组
    const scoredItems = attachmentFilenames.map((filename) => {
      const name = PathUtils.filename(filename);
      const name_no_ext = name.replace(/\.(pdf|caj|kdh|nh)$/i, "");
      ztoolkit.log(
        searchString,
        name,
        name_no_ext,
        compareTwoStrings(searchString, name_no_ext),
      );
      return {
        title: name,
        filename: name,
        score: compareTwoStrings(searchString, name_no_ext),
        url: filename,
        source: "local",
      };
    });
    ztoolkit.log(scoredItems);

    // 按评分降序排序
    const sortedItems = scoredItems.sort((a, b) => b.score - a.score);

    // 过滤阈值并取前3项
    const topMatches = sortedItems
      .filter((item) => item.score >= threshold)
      .slice(0, top);

    return topMatches.length > 0 ? topMatches : null;
  }

  async importAttachment(task: AttachmentTask): Promise<void> {
    if (
      !task.searchResults ||
      task.searchResults.length === 0 ||
      task.resultIndex === undefined
    ) {
      task.addMsg("Found attachment, but import failed.");
      task.status = "fail";
      return;
    }
    const searchResult = task.searchResults[task.resultIndex];
    const importOptions: _ZoteroTypes.Attachments.OptionsFromFile = {
      file: searchResult.url,
      parentItemID: task.item.id,
      title: `FullText_by_Jasminum.${searchResult.title}`,
    };
    const importItem = await Zotero.Attachments.importFromFile(importOptions);
    if (importItem) {
      task.status = "success";
    }
  }
}
