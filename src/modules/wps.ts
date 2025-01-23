async function unZip(filename: string, outDir: string) {
  ztoolkit.log(outDir, filename);
  const zipFile = Zotero.File.pathToFile(filename);
  // @ts-ignore -- Not typed.
  const zipReader = Components.classes[
    "@mozilla.org/libjar/zip-reader;1"
  ].createInstance(Components.interfaces.nsIZipReader);
  zipReader.open(zipFile);
  // Extract files
  const entries = zipReader.findEntries("*");
  const subfolders = new Set<string>();
  const entryFiles: any = {};
  while (entries.hasMore()) {
    const entry = entries.getNext();
    // Unix Mac Windows, path seperator.
    const pathParts = entry.split(/[/\\]/);
    if (pathParts.length > 1)
      subfolders.add(PathUtils.join(outDir, pathParts.slice(0, -1)));
    if (entry.endsWith("/") || entry.endsWith("\\")) {
      continue;
    }
    entryFiles[entry] = PathUtils.join(outDir, pathParts);
  }
  for (const e of subfolders) {
    ztoolkit.log("Create subfolder: " + e);
    await IOUtils.makeDirectory(e, { ignoreExisting: true });
    ztoolkit.log(`${await IOUtils.exists(e)}`);
  }

  Object.keys(entryFiles).forEach((e) => {
    ztoolkit.log(e, entryFiles[e]);
    zipReader.extract(e, Zotero.File.pathToFile(entryFiles[e]));
  });

  zipReader.close();
}

export async function downloadWpsPlugin() {
  const baseDir = PathUtils.join(Zotero.DataDirectory.dir, "jasminum");
  const wpsFolder = PathUtils.join(baseDir, "wps");
  const unzipFolder = PathUtils.join(wpsFolder, "unzip");
  const zipFilename = PathUtils.join(wpsFolder, "wps.zip");
  await IOUtils.makeDirectory(unzipFolder, {
    ignoreExisting: true,
    createAncestors: true,
  });
  const wpsUrl = "https://ftp.linxingzhong.top/";
  const tmpContent = await Zotero.File.getContentsFromURLAsync(wpsUrl);
  await Zotero.File.putContentsAsync(zipFilename, tmpContent);
  ztoolkit.log("WPS plugins download complete");
  await unZip(zipFilename, unzipFolder);
  ztoolkit.log("Unzip completed. " + unzipFolder);
}

export async function installWpsPlugin() {
  let runStatus: true | Error;
  if (Zotero.isWin) {
    runStatus = await Zotero.Utilities.Internal.exec("安装.exe", []);
  } else {
    runStatus = await Zotero.Utilities.Internal.exec("python", ["install.py"]);
  }

  if (runStatus == true) {
    ztoolkit.log("Install completed.");
  } else {
    ztoolkit.log("Install errors", runStatus);
  }
}
