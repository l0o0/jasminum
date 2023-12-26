import { FilePickerHelper } from "zotero-plugin-toolkit/dist/helpers/filePicker";
import { clearPref, getPref, setPref } from "../utils/prefs";
import { showPop } from "../utils/window";
import { getString } from "../utils/locale";

const Choices: any = {
  namepatent: { "{%t}_{%g}": 1, "{%t}": 2 },
  pdftkpath: {
    "C:\\Program Files (x86)\\PDFtk Server\\bin": 1,
    "/usr/bin": 2,
    "/opt/pdflabs/pdftk": 3,
    "/usr/local/bin/pdftk": 4,
  },
  language: { "zh-CN": 1, "en-US": 2 },
};

export async function checkPath(pathvalue: string): Promise<void> {
  if (!pathvalue) return;
  let pdftk = "";
  let checkResult = false;
  try {
    if (ztoolkit.getGlobal("Zotero").isWin) {
      pdftk = PathUtils.join(pathvalue, "pdftk.exe");
    } else {
      pdftk = PathUtils.join(pathvalue, "pdftk");
    }
    checkResult = await IOUtils.exists(pdftk);
  } catch (e) {
    ztoolkit.log("pdftk check error");
    ztoolkit.log(e);
  }
  ztoolkit.log(checkResult);
  addon.data
    .prefs!.window.document.querySelector("#path-accept")
    ?.setAttribute("hidden", `${!checkResult}`);
  addon.data
    .prefs!.window.document.querySelector("#path-error")
    ?.setAttribute("hidden", `${checkResult}`);
}

async function getLastUpdateFromFile(filename: string): Promise<string> {
  const desPath = PathUtils.join(
    PathUtils.join(
      ztoolkit.getGlobal("Zotero").Prefs.get("dataDir") as string,
      "translators",
      filename
    )
  );
  Zotero.debug(desPath);
  if (!(await ztoolkit.getGlobal("OS").File.exists(desPath))) {
    Zotero.debug(filename + " not exists");
    return "---";
  }
  try {
    const source = (await ztoolkit
      .getGlobal("Zotero")
      .File.getContentsAsync(desPath)) as string;
    const infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;
    const metaData = JSON.parse(infoRe.exec(source)![0]);
    return metaData.lastUpdated;
  } catch (e) {
    Zotero.debug(e);
    return "---";
  }
}

async function insertTable(firstInit = true, refresh = false): Promise<void> {
  ztoolkit.log("********** insert Table");
  const data = await getTranslatorData(refresh);
  const tbody = addon.data.prefs!.window.document.querySelector(
    "#jasminum-translator-table-tbody"
  );
  ztoolkit.log(data);
  if (data && firstInit) {
    ztoolkit.log("get translator data ok");
    (
      addon.data.prefs!.window.document.querySelector(
        "#jasminum-translator-table-loading"
      )! as any
    ).hidden = true;
    (
      addon.data.prefs!.window.document.querySelector(
        "#jasminum-translator-table"
      )! as HTMLElement
    ).style["display"] = "unset";
  } else if (data && refresh) {
    tbody?.querySelectorAll("tr").forEach((e) => e.remove());
  }

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
    span.setAttribute("class", "jasminum-tooltip-text");
    span.setAttribute("id", "jasminum-fade");
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
    const bu = document.createElement("button");
    bu.setAttribute("title", "下载");
    bu.setAttribute("class", "jasminum-translator-button");
    bu.setAttribute("value", k);
    // bu.textContent = getString("translator-download")
    bu.addEventListener("click", async (e) => {
      ztoolkit.log(`Download ${k} ${tdata.label}`);
      await downloadTranslator(k);
    });
    const img = document.createElement("img");
    if (tdata.lastUpdated == localupdate) {
      img.setAttribute("src", "chrome://jasminum/content/icons/accept.png");
    } else {
      img.setAttribute("src", "chrome://jasminum/content/icons/down.png");
    }
    img.setAttribute("id", `${idprefix}_4`);
    bu.appendChild(img);
    td4.appendChild(bu);
    // td4.appendChild(img);
    tr.appendChild(td4);
    tbody!.appendChild(tr);
  }
}

async function getTranslatorData(refresh = true): Promise<any> {
  const baseUrl = getPref("translatorurl")
    ? getPref("translatorurl")
    : "https://oss.wwang.de/translators_CN";
  const url = baseUrl + "/data/translators.json";

  const cacheFile = ztoolkit.getGlobal("Zotero").getTempDirectory();
  if (!cacheFile.exists()) {
    // Sometimes the temp folder is missing
    await ztoolkit
      .getGlobal("Zotero")
      .File.createDirectoryIfMissingAsync(cacheFile.path);
  }
  cacheFile.append("translator.json");
  ztoolkit.log(cacheFile.path);
  let contents;
  if (refresh == false && cacheFile.exists()) {
    contents = await ztoolkit
      .getGlobal("Zotero")
      .File.getContentsAsync(cacheFile, "utf8");
    return JSON.parse(contents as string);
  } else {
    try {
      contents = await ztoolkit
        .getGlobal("Zotero")
        .File.getContentsFromURLAsync(url);
      await ztoolkit
        .getGlobal("Zotero")
        .File.putContentsAsync(cacheFile, contents);
      return JSON.parse(contents);
    } catch (e) {
      ztoolkit.log("更新转换器数据失败");
      ztoolkit.log(e);
      return "";
    }
  }
}

async function updateTranslatorImg(filename: string): Promise<void> {
  const idprefix = filename.replace(/\s/g, "_");
  const localUpdate = await getLastUpdateFromFile(filename);
  const lastUpate = addon.data.prefs?.window.document.getElementById(
    `${idprefix}_3`
  )!.textContent;
  if (localUpdate == lastUpate) {
    (
      addon.data.prefs?.window.document.getElementById(
        `${idprefix}_2`
      ) as HTMLElement
    ).textContent = localUpdate;
    addon.data.prefs?.window.document
      .getElementById(`${idprefix}_4`)!
      .setAttribute("src", "chrome://jasminum/content/icons/accept.png");
  }
}

async function downloadTranslator(filename: string): Promise<void> {
  // var url = `https://gitee.com/l0o0/translators_CN/raw/master/translators/${label}`;
  // var url = `https://gitcode.net/goonback/translators_CN/-/raw/master/translators/${label}`;
  // let url = `https://oss.wwang.de/translators_CN/${label}`;
  const baseUrl = getPref("translatorurl")
    ? getPref("translatorurl")
    : "https://oss.wwang.de/translators_CN";
  const url = baseUrl + "/" + filename;
  ztoolkit.log(url);
  try {
    const contents = await ztoolkit
      .getGlobal("Zotero")
      .File.getContentsFromURL(url);
    const desPath = PathUtils.join(
      PathUtils.join(
        ztoolkit.getGlobal("Zotero").Prefs.get("dataDir") as string,
        "translators"
      ),
      filename
    );
    await IOUtils.writeUTF8(desPath, contents);
    await updateTranslatorImg(filename);
    ztoolkit.log(`${filename} 下载成功`);
    showPop(
      getString("translator-download-success", { args: { filename: filename } })
    );
  } catch (e) {
    ztoolkit.log(`${filename} 下载失败 ${e}`);
    showPop(
      getString("translator-download-fail", { args: { filename: filename } }),
      "fail"
    );
  }
}

export async function downloadAll() {
  const data = await getTranslatorData(false);
  Object.keys(data).forEach(async (label) => await downloadTranslator(label));
}

export async function refreshTable() {
  await insertTable(false, true);
}

function updateMenu(e: Event, prefName: string) {
  const menuValue = (e.target as HTMLInputElement).value;
  const inputField = addon.data.prefs!.window.document.querySelector(
    `#jasminum0${prefName}-input`
  ) as HTMLInputElement;
  if (menuValue) {
    // 选中候选选项
    setPref(prefName, menuValue);
  } else {
    inputField.value = "";
    inputField.focus();
  }
}

function updateMenuListIndex(id: string, value: string) {
  ztoolkit.log(id);
  ztoolkit.log(Choices);
  const menulist = addon.data.prefs!.window.document.querySelector(
    `#jasminum-${id}-menulist`
  ) as any;
  // 注意此处的index计算，Choices 是从1开始，避免0被判断为false
  const index = (Choices[id][value] || Object.keys(Choices[id]).length + 2) - 1;
  menulist.selectedIndex = index;
}

function updateInput(e: Event, id: string) {
  const inputValue = (e.target as HTMLInputElement).value;
  updateMenuListIndex(id, inputValue);
}

// Display the right menu when open pref window
function checkInputMenu() {
  const prefs = ["namepatent", "pdftkpath", "language"];
  for (const p of prefs) {
    updateMenuListIndex(p, getPref(p) as string);
  }
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = { window: _window };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI();
  bindPrefEvents();
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  if (addon.data.prefs?.window == undefined) return;

  ztoolkit.log("***** update UI");
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  checkInputMenu();
  // Update pdftk check icon
  await checkPath(getPref("pdftkpath") as string);
  // Update translator table
  await insertTable(true, true);
  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document.querySelector("#jasminum-open-cnki")
    ?.addEventListener("click", (e) => {
      addon.data.prefs!.window.alert(`open CNKI`);
    });

  addon.data
    .prefs!.window.document.querySelector("#jasminum-pdftkpath-input")
    ?.addEventListener("change", async (e) => {
      await checkPath((e.target as HTMLInputElement).value);
    });

  addon.data
    .prefs!.window.document.querySelector("#jasminum-pdftkpath-menulist")
    ?.addEventListener("command", async (e) => {
      await checkPath((e.target as HTMLInputElement).value);
    });

  addon.data
    .prefs!.window.document.querySelector("#choose-button")
    ?.addEventListener("click", async (e) => {
      const f = await new FilePickerHelper(
        `${Zotero.getString("pdftk-picker-header")}`,
        "folder"
      ).open();
      if (f) {
        setPref("pdftkpath", f);
        await checkPath(f);
      }
    });

  addon.data
    .prefs!.window.document.querySelector("#download-all-translators")
    ?.addEventListener("click", async (e) => {
      ztoolkit.log("download all translators");
      await downloadAll();
    });

  addon.data
    .prefs!.window.document.querySelector("#refresh-translators")
    ?.addEventListener("click", async (e) => {
      ztoolkit.log("refresh translators");
      await refreshTable();
    });

  addon.data
    .prefs!.window.document.querySelector("#choose-pdf-match-button")
    ?.addEventListener("click", async (e) => {
      const f = await new FilePickerHelper(
        `${Zotero.getString("pdf-match-folder-header")}`,
        "folder"
      ).open();
      if (f) {
        setPref("pdfmatchfolder", f);
      }
    });

  // 可编辑的下拉及输入选项
  const special_input = Object.keys(Choices);
  for (const id of special_input) {
    addon.data
      .prefs!.window.document.querySelector(`#jasminum-${id}-input`)
      ?.addEventListener("input", (e) => updateInput(e, id));

    addon.data
      .prefs!.window.document.querySelector(`#jasminum-${id}-menulist`)
      ?.addEventListener("command", (e) => updateMenu(e, id));
  }
}
