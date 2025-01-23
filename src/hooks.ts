import { config } from "../package.json";
import { getString, initLocale } from "./utils/locale";
import {
  registerPrefs,
  registerPrefsScripts,
  initPrefs,
  migratePrefs,
} from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { registerMenu } from "./modules/menu";
import {
  registerNotifier,
  registerExtraColumnWithCustomCell,
} from "./modules/notifier";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();
  registerMenu();
  registerPrefs();
  migratePrefs();
  initPrefs();
  registerNotifier();
  registerExtraColumnWithCustomCell();
  // BasicExampleFactory.registerPrefs();

  // BasicExampleFactory.registerNotifier();

  // KeyExampleFactory.registerShortcuts();

  // await UIExampleFactory.registerExtraColumn();

  // await UIExampleFactory.registerExtraColumnWithCustomCell();

  // UIExampleFactory.registerItemPaneSection();

  // UIExampleFactory.registerReaderItemPaneSection();
  // @ts-ignore - Not typed.
  await Zotero.Promise.delay(1000);
  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  // @ts-ignore This is a moz feature
  win.MozXULElement.insertFTLIfNeeded(`${config.addonRef}-mainWindow.ftl`);

  // const popupWin = new ztoolkit.ProgressWindow(config.addonName, {
  //   closeOnClick: true,
  //   closeTime: -1,
  // })
  //   .createLine({
  //     text: getString("startup-begin"),
  //     type: "default",
  //     progress: 0,
  //   })
  //   .show();
  // // @ts-ignore - Promise delay is not typed.
  // await Zotero.Promise.delay(1000);
  // popupWin.changeLine({
  //   progress: 30,
  //   text: `[30%] ${getString("startup-begin")}`,
  // });

  // UIExampleFactory.registerStyleSheet(win);

  // UIExampleFactory.registerRightClickMenuItem();

  // UIExampleFactory.registerRightClickMenuPopup(win);

  // UIExampleFactory.registerWindowMenuWithSeparator();

  // PromptExampleFactory.registerNormalCommandExample();

  // PromptExampleFactory.registerAnonymousCommandExample(win);

  // PromptExampleFactory.registerConditionalCommandExample();
  // @ts-ignore - Promise delay is not typed.
  // await Zotero.Promise.delay(1000);

  // popupWin.changeLine({
  //   progress: 100,
  //   text: `[100%] ${getString("startup-finish")}`,
  // });
  // popupWin.startCloseTimer(5000);

  // addon.hooks.onDialogEvents("dialogExample");
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  ztoolkit.log("unload plugin");
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
  delete Zotero[config.addonInstance];
  ztoolkit.log("shot down plugin");
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  ztoolkit.log("****** prefs event", type, data);
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
      // KeyExampleFactory.exampleShortcutLargerCallback();
      break;
    case "smaller":
      // KeyExampleFactory.exampleShortcutSmallerCallback();
      break;
    default:
      break;
  }
}

// function onDialogEvents(type: string) {
//   switch (type) {
//     case "dialogExample":
//       // HelperExampleFactory.dialogExample();
//       break;
//     case "clipboardExample":
//       // HelperExampleFactory.clipboardExample();
//       break;
//     case "filePickerExample":
//       // HelperExampleFactory.filePickerExample();
//       break;
//     case "progressWindowExample":
//       // HelperExampleFactory.progressWindowExample();
//       break;
//     case "vtableExample":
//       // HelperExampleFactory.vtableExample();
//       break;
//     default:
//       break;
//   }
// }

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onPrefsEvent,
  onShortcuts,
};
