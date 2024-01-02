async function getAttachments(folder: string): Promise<string[] | false> {
  const attachmentTypes = ["caj", "pdf"];
  const children = await IOUtils.getChildren(folder);
  const attachmentFiles = children.filter((e) => {
    if (attachmentTypes.includes(e.slice(-3))) {
      const stat = Zotero.File.pathToFile(e);
      if (stat.isFile()) return true;
    }
  });
  if (!attachmentFiles) {
    ztoolkit.log("No attachments in this folder");
    return false;
  } else {
    return attachmentFiles;
  }
}
