import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

export function randomBaseUrl() {
  const baseUrls = [
    "https://ftp.linxingzhong.top/translators_CN",
    "https://oss.wwang.de/translators_CN",
    "https://cdn.jsdelivr.net/gh/l0o0/translators_CN@master",
  ];
  const baseUrl = baseUrls[Math.floor(Math.random() * baseUrls.length)];
  ztoolkit.log(`use base url: ${baseUrl}`);
  return baseUrl;
}

/**
 * Get lastUpdated time from translator file
 * @param filename translator filename with extension
 * @returns lastUpdated time or false if failed
 */
export async function getLastUpdatedFromFile(
  filename: string,
): Promise<string | false> {
  const desPath = PathUtils.join(
    Zotero.DataDirectory.dir,
    "translators",
    filename,
  );
  const isFileExist = await IOUtils.exists(desPath);
  if (isFileExist === false) {
    ztoolkit.log(`get lastUpdated from file ${desPath} failed: file not exist`);
    return false;
  }
  try {
    // Assert source is a string in try block
    const source = (await Zotero.File.getContentsAsync(desPath)) as string;
    const infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;
    const metaData = JSON.parse(infoRe.exec(source)![0]);
    ztoolkit.log(
      `get lastUpdated from file ${desPath}: ${metaData.lastUpdated}`,
    );
    return metaData.lastUpdated;
  } catch (error) {
    ztoolkit.log(`get lastUpdated from file ${desPath} failed: ${error}`);
    return false;
  }
}

export async function getLastUpdatedMap(
  refresh = true,
): Promise<LastUpdatedMap> {
  const cachePath = PathUtils.join(
    Zotero.DataDirectory.dir,
    "translators_CN.json",
  );

  if (refresh === false && (await IOUtils.exists(cachePath))) {
    const contents = await Zotero.File.getContentsAsync(cachePath, "utf8");
    ztoolkit.log(`translator data has been loaded from cache: ${cachePath}`);
    return JSON.parse(contents as string);
  }
  try {
    const baseUrl = getPref("translatorSource");
    const contents = await Zotero.File.getContentsFromURLAsync(
      `${baseUrl}/data/translators.json`,
    );
    ztoolkit.log(`translator data has been loaded from remote: ${baseUrl}`);
    await Zotero.File.putContentsAsync(cachePath, contents);
    return JSON.parse(contents);
  } catch (event) {
    ztoolkit.log(`getTranslatorsData failed: ${event}`);
    return {};
  }
}

/**
 * Download outdated translators from the source, with 12 hours interval by default.
 *
 * TODO: Download error when file is read-only in windows.
 * @param force Whether ignore the time interval and force to download
 */
export async function updateTranslators(force = false): Promise<boolean> {
  let needUpdate = false;
  const lastUpdateTime = getPref("translatorUpdateTime");
  const now = Date.now();
  if (force == true || lastUpdateTime === undefined) {
    ztoolkit.log(
      `need to update translators, force: ${force}, lastUpdateTime: ${lastUpdateTime}`,
    );
    needUpdate = true;
  } else {
    if (now - lastUpdateTime > 1000 * 60 * 60 * 12) {
      ztoolkit.log(
        "need to update translators, it has been over 12 hours since the last update",
      );
      needUpdate = true;
    } else {
      ztoolkit.log(
        "no need to update translators, it has been less than 12 hours since the last update",
      );
    }
  }

  if (needUpdate === false) return false;

  const translatorData = await getLastUpdatedMap(needUpdate);
  const baseUrl = getPref("translatorSource");
  ztoolkit.log(`update translators from base: ${baseUrl}`);
  const popupWin = new ztoolkit.ProgressWindow(getString("plugin-name"), {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("update-translators-start"),
      type: "default",
      progress: 0,
    })
    .show();
  const progressStep = 100 / Object.keys(translatorData).length;
  const translatorUpdateTasks = Object.keys(translatorData).map(
    async (filename) => {
      let type = "default",
        text = "",
        progress = 0;
      const localUpdateTime = await getLastUpdatedFromFile(filename);
      const remoteUpdateTime = translatorData[filename].lastUpdated;
      if (
        localUpdateTime === false ||
        new Date(remoteUpdateTime) > new Date(localUpdateTime)
      ) {
        try {
          const url = `${baseUrl}/${filename}`;
          const code = await Zotero.File.getContentsFromURLAsync(url);
          const desPath = PathUtils.join(
            Zotero.DataDirectory.dir,
            "translators",
            filename,
          );
          await IOUtils.writeUTF8(desPath, code);
          type = "success";
          text = getString("update-successfully", {
            args: { name: filename },
          });
        } catch (error) {
          type = "fail";
          text = getString("update-failed", {
            args: { name: filename },
          });
          ztoolkit.log(`update translator ${filename} failed: ${error}`);
        }
      } else {
        type = "default";
        text = getString("update-skipped", {
          args: { name: filename },
        });
        ztoolkit.log(`translator ${filename} is already up to date, skipped`);
      }
      progress += progressStep;
      popupWin.changeLine({
        type,
        text,
        progress,
      });
    },
  );
  await Promise.all(translatorUpdateTasks);
  // @ts-ignore Translators is missing
  await Zotero.Translators.reinit();
  setPref("translatorUpdateTime", now);
  popupWin.changeLine({
    text: getString("update-translators-complete"),
    type: "default",
    progress: 100,
  });
  popupWin.startCloseTimer(3000);
  ztoolkit.log(`translators updated at ${new Date(now)}`);
  return true;
}
