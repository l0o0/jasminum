import { FilePickerHelper } from "zotero-plugin-toolkit/dist/helpers/filePicker";
import { setPref } from "../utils/prefs";
import { config } from "../../package.json";

export async function checkPath(pathvalue: string): Promise<void> {
  let pdftk = "";
  if (ztoolkit.getGlobal('Zotero').isWin) {
    pdftk = OS.Path.join(pathvalue, "pdftk.exe");
  } else {
    pdftk = OS.Path.join(pathvalue, "pdftk");
  }
  const check = await OS.File.exists(pdftk);
  addon.data
      .prefs!.window.document.querySelector(
        "#path-accept"
      )?.setAttribute("hidden", `${!check}`);
  addon.data
    .prefs!.window.document.querySelector(
      "#path-error"
  )?.setAttribute("hidden", `${check}`);
}

async function getLastUpdateFromFile(filename: string): Promise<string> {
  const desPath = ztoolkit.getGlobal('OS').Path.join(
      ztoolkit.getGlobal('Zotero').Prefs.get("dataDir") as string,
      "translators",
      filename
  );
  Zotero.debug(desPath);
  if (!(await ztoolkit.getGlobal('OS').File.exists(desPath))) {
      Zotero.debug(filename + " not exists");
      return "---";
  }
  try {
      const source = await ztoolkit.getGlobal('Zotero').File.getContentsAsync(desPath) as string;
      const infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;
      const metaData = JSON.parse(infoRe.exec(source)![0]);
      return metaData.lastUpdated;
  } catch (e) {
      Zotero.debug(e);
      return "---";
  }
};

async function insertTable(): Promise<void> {
  const data = await updateTranslatorData(true);
  if (data) {
    ztoolkit.log("get translator data ok");
    (addon.data
    .prefs!.window.document
    .querySelector("#jasminum-translator-table-loading")! as any).hidden = true;
    (addon.data
    .prefs!.window.document
    .querySelector("#jasminum-translator-table")! as HTMLElement).style['display'] = 'unset';
  }
  ztoolkit.log(data);
  const tbody = addon.data
    .prefs!.window.document
    .querySelector("#jasminum-translator-table-tbody");
  for (const k in data) {
    const idprefix = k.replace(/\s/g, "_");
    ztoolkit.log(k);
    const tdata = data[k];
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const div = document.createElement("div");
    div.setAttribute("class", "jasminum-hover-text");
    div.textContent = tdata.label;
    const span = document.createElement("span");
    span.setAttribute("class", 'jasminum-tooltip-text')
    span.setAttribute("id", 'jasminum-fade');
    span.textContent = k;
    div.appendChild(span);
    td1.appendChild(div);
    tr.appendChild(td1);
    const td2 = document.createElement("td");
    const localupdate = await getLastUpdateFromFile(k);
    td2.textContent = localupdate;
    td2.setAttribute("id", `${idprefix}_2`);
    tr.appendChild(td2);
    const td3 = document.createElement("td");
    td3.textContent = tdata.lastUpdated;
    td3.setAttribute("id", `${idprefix}_3`);
    tr.appendChild(td3);
    const td4 = document.createElement("td");
    const bu = document.createElement('button');
    bu.setAttribute("title", "下载");
    bu.setAttribute("class", 'jasminum-translator-button');
    bu.setAttribute("value", k);
    // bu.textContent = getString("translator-download")
    bu.addEventListener("click", async (e) => {
      ztoolkit.log(`Download ${k} ${tdata.label}`);
      await downloadTranslator(k);
    })
    const img = document.createElement("img");
    if (tdata.lastUpdated == localupdate) {
      img.setAttribute("src", "chrome://jasminum/content/icons/accept.png");
    } else {
      img.setAttribute("src", "chrome://jasminum/content/icons/down.png");
    }
    img.setAttribute("id", `${idprefix}_4`);
    bu.appendChild(img)
    td4.appendChild(bu);
    // td4.appendChild(img);
    tr.appendChild(td4);
    tbody!.appendChild(tr);
  }
}

async function updateTranslatorData(refresh = true): Promise<any> {
  const translatorUrl = Zotero.Prefs.get("jasminum.translatorurl");
  const url = translatorUrl + "/data/translators.json";
  const cacheFile = ztoolkit.getGlobal("Zotero").getTempDirectory();
  cacheFile.append("translator.json");
  let contents;
  if (refresh == false && cacheFile.exists()) {
    contents = await ztoolkit.getGlobal("Zotero").File.getContentsAsync(cacheFile, 'utf8');
    return JSON.parse(contents as string)
  } else {
    try {
      contents = await ztoolkit.getGlobal("Zotero").File.getContentsFromURLAsync(url);
      await ztoolkit.getGlobal("Zotero").File.putContentsAsync(cacheFile, contents);
      return JSON.parse(contents);
    } catch (e) {
      ztoolkit.log("更新转换器数据失败");
      ztoolkit.log(e);
      return '';
    }
  }
}

async function updateTranslatorImg(filename: string): Promise<void> {
  const idprefix = filename.replace(/\s/g, "_");
  const localUpdate = await getLastUpdateFromFile(filename);
  const lastUpate = addon.data.prefs?.window.document.getElementById(`${idprefix}_3`)!.textContent;
  if (localUpdate == lastUpate) {
    (addon.data.prefs?.window.document.getElementById(`${idprefix}_2`) as HTMLElement).textContent = localUpdate;
    addon.data.prefs?.window.document.getElementById(`${idprefix}_4`)!
      .setAttribute("src", "chrome://jasminum/content/icons/accept.png");
  }
}

async function downloadTranslator(filename: string): Promise<void> {
  const cacheFile = ztoolkit.getGlobal("Zotero").getTempDirectory();
  cacheFile.append(filename);
  if (cacheFile.exists()) {
      cacheFile.remove(false);
  }
  // var url = `https://gitee.com/l0o0/translators_CN/raw/master/translators/${label}`;
  // var url = `https://gitcode.net/goonback/translators_CN/-/raw/master/translators/${label}`;
  // let url = `https://oss.wwang.de/translators_CN/translators/${label}`;
  const url = Zotero.Prefs.get("jasminum.translatorurl") + "/" + filename;
  ztoolkit.log(url);
  try {
      const contents = await ztoolkit.getGlobal("Zotero").File.getContentsFromURL(url);
      const desPath = OS.Path.join(
          ztoolkit.getGlobal("Zotero").Prefs.get("dataDir") as string,
          "translators",
          filename
      );
      const desPathFile = ztoolkit.getGlobal("Zotero").File.pathToFile(desPath) as nsIFile;
      await ztoolkit.getGlobal("Zotero").File.putContentsAsync(desPathFile, contents);
      await updateTranslatorImg(filename);
      ztoolkit.log(`${filename} 下载成功`);
      new ztoolkit.ProgressWindow(config.addonName, {
        closeOnClick: true,
        closeTime: 1500,
      })
        .createLine({
          text: `${filename} 下载成功`,
          type: "success",
        })
        .show();
  } catch (e) {
    ztoolkit.log(`${filename} 下载失败 ${e}`);
    new ztoolkit.ProgressWindow(config.addonName, {
      closeOnClick: true,
      closeTime: 1500,
    })
      .createLine({
        text: `${filename} 下载失败 ${e}`,
        type: "fail",
      })
      .show();
  }
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  const data = await updateTranslatorData(true);
  const rows = Object.keys(data).map((e: any) => {return {name: (data[e] as any).label, "local": "xx", "remote": (data[e] as any).lastUpdated, "download": "点击下载"}});
  if (addon.data.prefs) {
    addon.data.prefs.window = _window;
  } else {
    addon.data.prefs = {window: _window, columns: [], rows: [] }
  }
  updatePrefsUI();
  bindPrefEvents();
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  if (addon.data.prefs?.window == undefined) return;

  // Update pdftk check icon
  await checkPath(ztoolkit.getGlobal("Zotero").Prefs.get("jasminum.pdftkpath") as string);
  // Update translator table
  await insertTable();
  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document.querySelector(
      "#jasminum-pdftk-path"
    )
    ?.addEventListener("change", (e) => {
      ztoolkit.log(e);
      addon.data.prefs!.window.alert(
        `Successfully changed to ${(e.target as HTMLInputElement).value}!`
      );
    });

    addon.data
    .prefs!.window.document.querySelector(
      "#jasminum-open-cnki"
    )
    ?.addEventListener("click", (e) => {
      ztoolkit.log(e);
      addon.data.prefs!.window.alert(
        `open CNKI`
      );
    });

  addon.data
    .prefs!.window.document.querySelector(
      "#jasminum-pdftk-path"
    )
    ?.addEventListener("change", async (e) => {
      await checkPath((e.target as HTMLInputElement).value);
    });

  addon.data
    .prefs!.window.document.querySelector(
      "#choose-button"
    )
    ?.addEventListener("click", async (e) => {
      const f = await new FilePickerHelper(
        `${Zotero.getString("pdftk-picker-header")}`,
        "folder",
      ).open();
      if (f) {
        setPref("pdftkpath", f);
        await checkPath(f);
      }
    });
}
