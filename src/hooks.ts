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
