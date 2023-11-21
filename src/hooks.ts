import {
  BasicExampleFactory,
  KeyExampleFactory,
  UIExampleFactory,
} from "./modules/jasminum";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { displayMenuitem } from "../src/modules/ui";
import { showPop } from "./utils/window";
import { clearPref, getPref, setPref } from "./utils/prefs";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/icon.png`
  );  

  BasicExampleFactory.registerPrefs();

  BasicExampleFactory.registerNotifier();

  //   KeyExampleFactory.registerShortcuts();

  await Zotero.Promise.delay(1000);
  UIExampleFactory.registerRightClickMenuPopup();
  await UIExampleFactory.registerExtraColumn();

  // await UIExampleFactory.registerExtraColumnWithCustomCell();

  //   await UIExampleFactory.registerCustomCellRenderer();

  //   await UIExampleFactory.registerCustomItemBoxRow();

  //   UIExampleFactory.registerLibraryTabPanel();

  //   await UIExampleFactory.registerReaderTabPanel();
  await Zotero.Promise.delay(1000);
  ztoolkit
    .getGlobal("ZoteroPane")
    .document.getElementById("zotero-itemmenu")!
    .addEventListener(
      "popupshowing", 
      displayMenuitem,
      false
    );

  // Migrate Prefs from Zotero 6 to 7
  migratePrefs();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any }
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (
    event == "add" &&
    type == "item"
  ) {
    const items = Zotero.Items.get(ids as number[]);
    BasicExampleFactory.itemAddedNotifier(items);
  }
}


// Run this when addon is first run
// Keep preferences startswith extensions.jasminum
function migratePrefs() {
  ztoolkit.log("start to migrate");
  if ( getPref("firstrun") != false ) {
    const extensionBranch = Services.prefs.getBranch("extensions");
    const prefs = extensionBranch.getChildList("", {});
    const jasminmPrefs = prefs.filter((p: string) => p.includes(".zotero.jasminum."))
    jasminmPrefs.forEach((ele: string) => {
      ztoolkit.log("extensions" + ele);
      const longPrefName = ele.replace(/^\.zotero\./, '');
      const shortPrefName = longPrefName.split(".")[1];
      const prefValue = Zotero.Prefs.get(longPrefName);
      if (prefValue != undefined && getPref(shortPrefName) == undefined) {
        setPref(shortPrefName, prefValue);
        Zotero.Prefs.clear(longPrefName);
      }
    });
    setPref("firstrun", false);
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(type: string) {
  switch (type) {
    case "larger":
      KeyExampleFactory.exampleShortcutLargerCallback();
      break;
    case "smaller":
      KeyExampleFactory.exampleShortcutSmallerCallback();
      break;
    case "confliction":
      KeyExampleFactory.exampleShortcutConflictingCallback();
      break;
    default:
      break;
  }
}


// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

export default {
  onStartup,
  onShutdown,
  onNotify,
  onPrefsEvent,
  onShortcuts,
};
