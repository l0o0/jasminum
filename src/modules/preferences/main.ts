import { config } from "../../../package.json";
import { isMainlandChina } from "../../utils/http";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { updateTranslators, randomBaseUrl } from ".././translators";
import type { PluginPrefsMap } from "../../utils/prefs";
import { onShowTable } from "./translators";

export function registerPrefsPane() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: `chrome://${config.addonRef}/content/preferences-main.xhtml`,
    label: getString("plugin-name"),
    image: `chrome://${config.addonRef}/content/icons/icon.png`,
  });
}

/**
 * This function is called when the prefs window is opened
   See addon/chrome/content/preferences.xul onpaneload
 * @param _window Preference window
 */
export async function onPrefsWindowLoad(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI(addon.data.prefs.window.document);
  bindPrefEvents(addon.data.prefs.window.document);
}

/**
 * Initialize platform specific preferences
 */
export async function initPrefs() {
  ztoolkit.log("init some prefs");

  if (addon.data.env == "development") {
    setPref("firstRun", true);
  }

  if (getPref("firstRun")) {
    // For Zotero 6
    migratePrefs("extensions.zotero.jasminum.");
    // For Zotero 7
    migratePrefs("extensions.jasminum.");

    const inMainlandChina = await isMainlandChina();
    setPref("isMainlandChina", inMainlandChina);

    setPref("firstRun", false);
  }

  if (!getPref("pdfMatchFolder")) {
    setPref(
      "pdfMatchFolder",
      Services.dirsvc.get("DfltDwnld", Ci.nsIFile).path,
    );
  }

  setPref("translatorSource", randomBaseUrl());
}

/**
 * Keep preferences startswith extensions.jasminum, clear deprecated preferences.
 * This function should be called only once when updating from old version extension.
 * @param prefix prefix with following dot
 */
function migratePrefs(prefix: string) {
  ztoolkit.log(`migrate prefs with prefix ${prefix}`);

  const acceptPrefsMap: Record<string, keyof PluginPrefsMap> = {
    firstrun: "firstRun",
    /* tools */
    ennamesplit: "enNameSplit",
    zhnamesplit: "zhNameSplit",
    language: "language",
    /* retrieve metadata */
    autoupdate: "autoUpdateMetadata",
    namepattern: "namePattern",
    namepatternCustom: "namePatternCustom",
    metadataSource: "metadataSource",
    /* match pdf */
    pdfMatchFolder: "pdfMatchFolder",
    /* update translators */
    autoUpdateTranslators: "autoUpdateTranslators",
    translatorSource: "translatorSource",
  };
  function isPrefKey(key: string): key is keyof typeof acceptPrefsMap {
    return key in acceptPrefsMap;
  }

  const oldPrefs = Services.prefs.getBranch(prefix).getChildList("");
  for (const oldPrefKey of oldPrefs) {
    const oldFullKey = `${prefix}${oldPrefKey}`;
    const prefValue = Zotero.Prefs.get(oldFullKey);
    if (prefValue !== undefined) {
      if (isPrefKey(oldPrefKey)) {
        const newPrefKey = acceptPrefsMap[oldPrefKey];
        // New preference key is compatible with old preference value
        setPref(newPrefKey, prefValue as PluginPrefsMap[keyof PluginPrefsMap]);
        ztoolkit.log(
          `Migrate preference ${oldFullKey} -> ${config.prefsPrefix}.${newPrefKey}, ${prefValue}`,
        );
      } else {
        Zotero.Prefs.clear(oldFullKey);
      }
    }
  }
}

/**
 * Initialize UI elements on prefs window with addon.data.prefs.window.document
 */
async function updatePrefsUI(doc: Document) {
  const namePatterns: Record<string, number> = {
    auto: 1,
    "{%t}_{%g}": 2,
    "{%t}": 3,
    custom: 4,
  };
  (
    doc.querySelector(
      "#zotero-prefpane-jasminum-namepattern-menulist",
    ) as XULMenuListElement
  ).selectedIndex = namePatterns[getPref("namePattern")] - 1;
}

function bindPrefEvents(doc: Document) {
  /* PDF file name patttern */
  doc
    .getElementById(`zotero-prefpane-${config.addonRef}-namepattern-menulist`)
    ?.addEventListener("click", (event: Event) => {
      const pName = "namePattern";
      const value = (event.target as XULMenuItemElement).getAttribute("value")!;
      const customInput = doc.getElementById(
        `zotero-prefpane-${config.addonRef}-namepatternCustom-input`,
      );
      const input = doc.getElementById(
        `zotero-prefpane-${config.addonRef}-namepattern-input`,
      );

      const isCustom = value === "custom";
      if (isCustom) setPref("namePattern", "custom");
      customInput?.classList.toggle("hidden", !isCustom);
      input?.classList.toggle("hidden", isCustom);
      setPref(pName, value);
    });

  /* Update translators */
  doc
    .getElementById(`zotero-prefpane-${config.addonRef}-force-update`)
    ?.addEventListener("click", async (event) => {
      (event.target as HTMLButtonElement).disabled = true;
      await updateTranslators(true);
      (event.target as HTMLButtonElement).disabled = false;
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-open-translator-table`)
    ?.addEventListener("click", async (event) => {
      onShowTable();
    });

  // metadata source dropdown
  // doc
  //   .querySelector(`#zotero-prefpane-${config.addonRef}-metadata-source-button`)
  //   ?.addEventListener("click", (e) => {
  //     e.stopPropagation(); // 阻止事件冒泡
  //     const pvalues = (getPref("metadataSource") as string).split(", ");
  //     doc.querySelectorAll("checkbox.metadata-drop-item")!.forEach((e: any) => {
  //       e.checked = pvalues.includes(e.getAttribute("value")!);
  //     });
  //     doc.querySelector("#metadata-source-dropdown")?.classList.toggle("show");
  //   });

  // doc
  //   .querySelector("#metadata-source-dropdown")
  //   ?.addEventListener("click", (e) => {
  //     const checkbox = (e.target as HTMLElement).closest(
  //       ".metadata-drop-item",
  //     )!;
  //     let pvalues = getPref("metadataSource").split(", ") || ["CNKI"];
  //     if (checkbox.getAttribute("checked") == "true") {
  //       const checkedSource = checkbox.getAttribute("value")!;
  //       if (!pvalues.includes(checkedSource)) {
  //         pvalues.push(checkedSource);
  //       }
  //     } else {
  //       pvalues = pvalues.filter(
  //         (option) => option !== checkbox.getAttribute("value")!,
  //       );
  //     }
  //     setPref("metadataSource", pvalues.join(", "));
  //   });

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
