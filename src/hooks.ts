import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import {
  registerPrefsPane,
  onPrefsWindowLoad,
  initPrefs,
} from "./modules/preferences/main";
import { createZToolkit } from "./utils/ztoolkit";
import { registerMenu } from "./modules/menu";
import {
  registerExtraColumnWithCustomCell,
  registerNotifiers,
} from "./modules/notifier";
import { injectStylesLink } from "./modules/styles";
import { updateTranslators } from "./modules/translators";
import { getPref } from "./utils/prefs";
import { registerTab } from "./modules/tab";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  registerPrefsPane();
  await initPrefs();

  registerNotifiers();

  registerMenu();
  registerTab();
  await registerExtraColumnWithCustomCell();

  injectStylesLink();

  // @ts-ignore - Not typed.
  await Zotero.Promise.delay(1000);
  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  // @ts-ignore - Not typed.
  await Zotero.Promise.delay(1000);

  if (getPref("autoUpdateTranslators")) {
    // @ts-ignore - Not typed.
    await Zotero.Promise.delay(10000);
    ztoolkit.log("auto update translators");
    updateTranslators();
  }
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
  delete Zotero[config.addonInstance];
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onPrefsWindowLoad,
};
