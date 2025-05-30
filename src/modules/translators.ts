import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

export function randomBaseUrl() {
  const baseUrls = [
    "https://ftp.linxingzhong.top/translators_CN",
    "https://oss.wwang.de/translators_CN",
    "https://www.wieke.cn/translators_CN",
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

async function mendTranslators() {
  const translators = Zotero.Translators.getAll();
  // 727 is the number of translators at the time of writing
  if (
    !getPref("firstRun") &&
    !getPref("translatorsMended") &&
    Object.keys(translators).length < 727
  ) {
    ztoolkit.log(
      "jasminum has been installed, and translators seems to be missing, try to reset them",
    );
    await Zotero.Schema.resetTranslators();
    setPref("translatorsMended", true);
  }
}

/**
 * Download outdated translators from the source, with 12 hours interval by default.
 *
 * TODO: Download error when file is read-only in windows.
 * @param force Whether ignore the time interval and force to download
 */
export async function updateTranslators(force = false): Promise<boolean> {
  if (addon.data.translators.updating) {
    ztoolkit.log("translators are updating, skip this update");
    return false;
  }
  try {
    addon.data.translators.updating = true;
    return await _updateTranslators(force);
  } catch (error) {
    return false;
  } finally {
    addon.data.translators.updating = false;
  }
}

async function _updateTranslators(force = false): Promise<boolean> {
  await Zotero.Schema.schemaUpdatePromise;
  await mendTranslators();
  let needUpdate = false;
  const lastUpdateTime = parseInt(getPref("translatorUpdateTime"));
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
  let progress = 0;
  let successCounts = 0;
  let skipCounts = 0;
  let failCounts = 0;
  const translatorUpdateTasks = Object.keys(translatorData).map(
    async (filename) => {
      let type = "default",
        text = "";
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
          successCounts += 1;
        } catch (error) {
          type = "fail";
          text = getString("update-failed", {
            args: { name: filename },
          });
          failCounts += 1;
          ztoolkit.log(`update translator ${filename} failed: ${error}`);
        }
      } else {
        skipCounts += 1;
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
  await Zotero.Translators.reinit({ fromSchemaUpdate: false });
  setPref("translatorUpdateTime", now.toString());
  popupWin.changeLine({
    text: getString("update-translators-complete", {
      args: { successCounts, failCounts, skipCounts },
    }),
    type: "default",
    progress: 100,
  });
  popupWin.startCloseTimer(3000);
  ztoolkit.log(
    `translators updated at ${new Date(now)}, success: ${successCounts}, skip: ${skipCounts}, fail: ${failCounts}`,
  );
  return true;
}
