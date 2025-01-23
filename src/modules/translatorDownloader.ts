import { getPref, setPref } from "../utils/prefs";

const baseUrls = [
  "https://ftp.linxingzhong.top/translators_CN",
  "https://oss.wwang.de/translators_CN",
];

export async function getLastUpdateFromFile(
  filename: string,
): Promise<string | false> {
  const desPath = PathUtils.join(
    PathUtils.join(
      Zotero.Prefs.get("dataDir") as string,
      "translators",
      filename,
    ),
  );
  const isFileExist: boolean = await IOUtils.exists(desPath);
  if (isFileExist == false) {
    ztoolkit.log(`local file ${filename} not exists`);
    return false;
  }
  try {
    const source = (await Zotero.File.getContentsAsync(desPath)) as string;
    const infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;
    const metaData = JSON.parse(infoRe.exec(source)![0]);
    ztoolkit.log("local file is: ", desPath, metaData.lastUpdated);
    return metaData.lastUpdated;
  } catch (e) {
    ztoolkit.log(e);
    return false;
  }
}

export async function getTranslatorData(refresh = true): Promise<any> {
  const baseUrl = getPref("translatorSource")
    ? getPref("translatorSource")
    : baseUrls[0];
  const url = baseUrl + "/data/translators.json";

  const cacheFile = Zotero.getTempDirectory();
  if (!cacheFile.exists()) {
    // Sometimes the temp folder is missing
    await Zotero.File.createDirectoryIfMissingAsync(cacheFile.path);
  }
  cacheFile.append("translator.json");
  ztoolkit.log(cacheFile.path);
  let contents;
  if (refresh == false && cacheFile.exists()) {
    contents = await Zotero.File.getContentsAsync(cacheFile, "utf8");
    ztoolkit.log("从缓存文件获取转换器数据");
    return JSON.parse(contents as string);
  } else {
    try {
      contents = await Zotero.File.getContentsFromURLAsync(url);
      await Zotero.File.putContentsAsync(cacheFile, contents);
      ztoolkit.log("从远程更新转换器数据成功");
      return JSON.parse(contents);
    } catch (e) {
      ztoolkit.log("更新转换器数据失败");
      ztoolkit.log(e);
      return "";
    }
  }
}

// To avoid frequent downloads that may cause pressure on the server,
// a time interval will be set.
// Additionally, only the non-updated translator will be downloaded.
// TODO, Download error when file is read-only in windows.
export async function downloadTranslator(force = false): Promise<boolean> {
  let needUpdate = false;
  const lastUpdateTime = getPref("translatorUpdateTime");
  const updateTime = new Date().toISOString().replace("T", " ").slice(0, 19);
  if (force == true || lastUpdateTime === undefined) {
    needUpdate = true;
  } else {
    const date1 = new Date(updateTime).getTime();
    const date2 = new Date(lastUpdateTime as string).getTime();
    if (Math.abs(date1 - date2) > 1000 * 60 * 60 * 12) {
      ztoolkit.log("It has been more than 12 hours since the last update");
      needUpdate = true;
    } else {
      ztoolkit.log(
        "It has been less than 12 hours since the last update, maybe you can force to update",
      );
    }
  }
  ztoolkit.log(needUpdate);
  ztoolkit.log(lastUpdateTime);
  if (needUpdate == false) return false;

  const translatorData = await getTranslatorData(needUpdate);

  const baseUrl = getPref("translatorSource")
    ? getPref("translatorSource")
    : baseUrls[0];
  for (const translator in translatorData) {
    const url = baseUrl + "/" + translator;
    ztoolkit.log(url);
    try {
      const contents = await Zotero.File.getContentsFromURLAsync(url);
      const desPath = PathUtils.join(
        PathUtils.join(Zotero.Prefs.get("dataDir") as string, "translators"),
        translator,
      );
      const localTranslatorUpdateTime = await getLastUpdateFromFile(translator);
      const serverTranslatorUpdateTime =
        translatorData[translator]["lastUpdated"];
      if (
        localTranslatorUpdateTime == false ||
        serverTranslatorUpdateTime > localTranslatorUpdateTime
      ) {
        await IOUtils.writeUTF8(desPath, contents);
        ztoolkit.log(`${translator} download succeeded`);
      } else {
        ztoolkit.log(
          `${translator} local translator is already up to date, no need to download`,
        );
      }
    } catch (e) {
      ztoolkit.log(`${translator} download failed, error: ${e}`);
    }
  }
  // @ts-ignore Translators is missing
  await Zotero.Translators.init({ reinit: true });
  setPref("translatorUpdateTime", updateTime);
  ztoolkit.log(`${updateTime}, translator udpated time`);
  return true;
}
