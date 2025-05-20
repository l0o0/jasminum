import { getPref } from "../../utils/prefs";
import { LocalAttachmentService } from "./localMatch";

const localService = new LocalAttachmentService();
export async function attachmentSearch(task: AttachmentTask): Promise<void> {
  const attachmentSearchResults = await localService.searchAttachments(task);
  if (!attachmentSearchResults || attachmentSearchResults.length === 0) {
    task.addMsg("No matching attachments found in local.");
    task.status = "fail";
    return;
  } else if (attachmentSearchResults.length === 1) {
    task.searchResults = attachmentSearchResults;
    task.resultIndex = 0;
    task.addMsg("Found one matching attachment in local.");
  } else {
    task.status = "multiple_results";
    task.searchResults = attachmentSearchResults;
    task.addMsg(
      `Found ${attachmentSearchResults.length} matching attachments in local.`,
    );
  }
}

export async function importAttachment(task: AttachmentTask): Promise<void> {
  // Maybe oneday I will support remote attachment import
  await localService.importAttachment(task);

  // Action after import
  await actionAfterImport(task.searchResults![task.resultIndex!].url);
}

export async function actionAfterImport(
  attachmentPath: string,
  action?: string,
): Promise<void> {
  const a = action || getPref("actionAfterAttachmentImport") || "nothing";
  const attachmentName = PathUtils.filename(attachmentPath);
  const backupFolder = PathUtils.join(
    getPref("pdfMatchFolder"),
    "jasminum-backup",
  );
  const backupFile = PathUtils.join(backupFolder, attachmentName);
  ztoolkit.log("Action after import: ", a, attachmentName);
  switch (a) {
    case "nothing":
      ztoolkit.log("No action after import.");
      break;
    case "backup":
      ztoolkit.log("Backing up the attachment...");
      await IOUtils.makeDirectory(backupFolder, { ignoreExisting: true });
      await IOUtils.move(attachmentPath, backupFile);
      break;
    case "delete":
      ztoolkit.log("Deleting the attachment...");
      await IOUtils.remove(attachmentPath);
      break;
  }
}
