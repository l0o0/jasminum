import { config } from "../../package.json";
import { isMainlandChina } from "../utils/http";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  downloadTranslator,
  getLastUpdateFromFile,
  getTranslatorData,
} from "./translatorDownloader";

export function registerPrefs() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: `chrome://${config.addonRef}/content/preferences.xhtml`,
    label: getString("prefs-title"),
    image: `chrome://${config.addonRef}/content/icons/icon.png`,
  });
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI();
  bindPrefEvents();
}

// Initialize platform specific preferences
export async function initPrefs() {
  ztoolkit.log("init some prefs");
  let downloadsPath: string;
  // @ts-ignore - Profile is not typed.
  const zoteroProfileDir = Zotero.Profile.dir;
  if (Zotero.isWin) {
    downloadsPath = zoteroProfileDir
      .split("\\")
      .slice(0, 3)
      .concat("Downloads")
      .join("\\");
  } else if (Zotero.isMac) {
    downloadsPath = zoteroProfileDir
      .split("/")
      .slice(0, 3)
      .concat("Downloads")
      .join("/");
  } else {
    downloadsPath = zoteroProfileDir
      .split("/")
      .slice(0, 3)
      .concat("Downloads")
      .join("/");
  }
  ztoolkit.log(getPref("pdfMatchFolder"));
  if (getPref("pdfMatchFolder") === undefined) {
    setPref("pdfMatchFolder", downloadsPath);
    ztoolkit.log(getPref("pdfMatchFolder"));
  }

  const inMainlandChina = await isMainlandChina();
  setPref("isMainlandChina", inMainlandChina);

  if (Math.random() > 0.5) {
    setPref("translatorSource", "https://ftp.linxingzhong.top/translators_CN/");
  } else {
    setPref("translatorSource", "https://oss.wwang.de/translators_CN");
  }
}

// Run this when addon is first run
// Keep preferences startswith extensions.jasminum
// I hope this function will be called only once when updating from old version.
export function migratePrefs() {
  ztoolkit.log("start to migrate");
  if (addon.data.env == "development") {
    setPref("firstrun", true);
  }
  if (getPref("firstrun") != false) {
    const extensionBranch = Services.prefs.getBranch("extensions");
    const jasminmPrefs = extensionBranch.getChildList(".zotero.jasminum.");
    const prefsList = [
      "autoUpdateTranslators",
      "namepattern",
      "autoupdate",
      "ennamesplit",
      "zhnamesplit",
      "rename",
      "metadataSource",
      "language",
      "pdfMatchFolder",
      "translatorSource",
    ];
    jasminmPrefs.forEach((ele: string) => {
      ztoolkit.log("extensions" + ele);
      const longPrefName = ele.replace(/^\.zotero\./, "");
      const shortPrefName = longPrefName.replace(/^jasminum\./, "");
      ztoolkit.log(longPrefName, shortPrefName);
      const prefValue = Zotero.Prefs.get(longPrefName);

      if (
        prefValue != undefined &&
        prefsList.includes(shortPrefName) &&
        // @ts-ignore - Too complicated for me
        getPref(shortPrefName) == undefined
      ) {
        ztoolkit.log(
          `Migrate from ${longPrefName} -> ${shortPrefName}, value: ${prefValue}`,
        );
        // @ts-ignore - Too complicated for me
        setPref(shortPrefName, prefValue);
      }
      Zotero.Prefs.clear(longPrefName);
    });
    setPref("firstrun", false);
  }
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  if (addon.data.prefs?.window == undefined) return;
  const namepatternChoices: Record<string, number> = {
    auto: 1,
    "{%t}_{%g}": 2,
    "{%t}": 3,
    custom: 4,
  };
  (
    addon.data.prefs.window.document.querySelector(
      "#zotero-prefpane-jasminum-namepattern-menulist",
    ) as XULMenuListElement
  ).selectedIndex = namepatternChoices[getPref("namepattern")] - 1;
}

async function openTranslatorTable() {
  ztoolkit.log("Open translator table");
  const windowArgs = {
    columns: [
      getString("translator-filename"),
      getString("translator-label"),
      getString("translator-localUpdateTime"),
      getString("translator-lastUpdated"),
    ],
    _initPromise: Zotero.Promise.defer(),
  };
  if (addon.data.windows && addon.data.windows.translators) {
    addon.data.windows.translators.focus();
    ztoolkit.log("Translators window is opened.");
  } else {
    const win = (
      Services.wm.getMostRecentWindow("navigator:browser") as Window
    ).openDialog(
      `chrome://${config.addonRef}/content/translators.xhtml`,
      "",
      "chrome,centerscreen,dialog=yes,resizable=no,status=no",
      windowArgs,
    );
    win!.onclose = (e) => {
      delete addon.data.windows.translators;
    };
    addon.data.windows.translators = win!;
    await windowArgs._initPromise.promise;
    ztoolkit.log(win);
    const translatorData = await getTranslatorData(true);

    const tableBody = win!.document.querySelector("#dataTable tbody")!;
    tableBody.innerHTML = "";

    for (const translator in translatorData) {
      const localUpdateTime = await getLastUpdateFromFile(translator);
      translatorData[translator].localUpdateTime = localUpdateTime || "--";
      const tr = win!.document.createElement("tr");
      const row = {
        filename: translator,
        label: translatorData[translator].label,
        localUpdateTime: translatorData[translator].localUpdateTime,
        lastUpdated: translatorData[translator].lastUpdated,
      };
      (Object.keys(row) as (keyof typeof row)[]).forEach((column) => {
        const td = win!.document.createElement("td");
        td.textContent = row[column];
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    }
    win!.document.getElementById("loading-img")!.style.display = "none";
    win!.document.getElementById("dataTable")!.style.display = "";
    ztoolkit.log("Table was rendered.");
  }
}

function bindPrefEvents() {
  const doc = addon.data.prefs!.window.document;

  doc
    .getElementById(`zotero-prefpane-${config.addonRef}-namepattern-menulist`)
    ?.addEventListener("click", (e: Event) => {
      const pName = "namepattern";
      const value = (e.target as XULMenuItemElement).getAttribute("value")!;
      const customInput = doc.getElementById(
        `zotero-prefpane-${config.addonRef}-namepatternCustom-input`,
      );
      const input = doc.getElementById(
        `zotero-prefpane-${config.addonRef}-namepattern-input`,
      );

      const isCustom = value === "custom";
      if (isCustom) setPref("namepattern", "custom");
      customInput?.classList.toggle("hidden", !isCustom);
      input?.classList.toggle("hidden", isCustom);
      setPref(pName, value);
    });

  doc
    .getElementById(`zotero-prefpane-${config.addonRef}-force-update`)
    ?.addEventListener("click", async (e) => {
      (e.target as HTMLButtonElement).disabled = true;
      await downloadTranslator(true);
      addon.data.prefs!.window.alert(getString("translator-downloaded"));
      (e.target as HTMLButtonElement).disabled = false;
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-open-translator-table`)
    ?.addEventListener("click", (e) => {
      openTranslatorTable();
    });

  // metadata source dropdown
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-metadata-source-button`)
    ?.addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      const pvalues = (getPref("metadataSource") as string).split(", ");
      doc.querySelectorAll("checkbox.metadata-drop-item")!.forEach((e: any) => {
        e.checked = pvalues.includes(e.getAttribute("value")!);
      });
      doc.querySelector("#metadata-source-dropdown")?.classList.toggle("show");
    });

  doc
    .querySelector("#metadata-source-dropdown")
    ?.addEventListener("click", (e) => {
      const checkbox = (e.target as HTMLElement).closest(
        ".metadata-drop-item",
      )!;
      let pvalues = getPref("metadataSource").split(", ") || ["CNKI"];
      if (checkbox.getAttribute("checked") == "true") {
        const checkedSource = checkbox.getAttribute("value")!;
        if (!pvalues.includes(checkedSource)) {
          pvalues.push(checkedSource);
        }
      } else {
        pvalues = pvalues.filter(
          (option) => option !== checkbox.getAttribute("value")!,
        );
      }
      setPref("metadataSource", pvalues.join(", "));
    });

  // doc
  //   .querySelector(
  //     `#zotero-prefpane-${config.addonRef}-pdf-match-folder-button`,
  //   )
  //   ?.addEventListener("click", async (e) => {
  //     const path = await new ztoolkit.FilePicker(
  //       getString("select-download-folder"),
  //       "folder",
  //       [],
  //     ).open();
  //     if (path) setPref("pdfMatchFolder", path);
  //   });

  // doc
  //   .querySelector(
  //     `#zotero-prefpane-${config.addonRef}-install-wps-plugin-button`,
  //   )
  //   ?.addEventListener("click", async (e) => {
  //     ztoolkit.getGlobal("window").alert("等待更新");
  //   });
}
