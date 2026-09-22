import { config } from "../../../package.json";
import { isMainlandChina } from "../../utils/http";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { updateTranslators, bestSpeedBaseUrl } from ".././translators";
import type { PluginPrefsMap } from "../../utils/prefs";
import { onShowTable } from "./translators";
import { openRemoteHelpDialog } from "./remoteHelp";
import { renderMetadataSources } from "./metadataSource";
import { getConfiguredLLMClient } from "../../utils/llm";

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

  if (
    !getPref("translatorSource") ||
    getPref("translatorSource") ===
      "https://ftp.linxingzhong.top/translators_CN"
  ) {
    setPref("translatorSource", await bestSpeedBaseUrl());
  }

  const translatortUpdateTime = getPref("translatorUpdateTime");
  if (
    typeof translatortUpdateTime !== "string" ||
    /\D/.test(translatortUpdateTime)
  ) {
    Zotero.Prefs.clear(`${config.prefsPrefix}.translatorUpdateTime`);
    setPref("translatorUpdateTime", "0");
  }
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
    zhnamesplit: "autoSplitName",
    ennamesplit: "splitEnName",
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
      const button = event.target as HTMLButtonElement;
      button.disabled = true;
      if (addon.data.translators.updating) {
        ztoolkit.log("Chinese translators are under updating.");
        addon.data.prefs?.window.alert(
          getString("info-translators-cn-updaing"),
        );
      } else {
        await updateTranslators(true);
      }
      addon.data.prefs?.window.setTimeout(() => {
        button.disabled = false;
      }, 3000);
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-open-translator-table`)
    ?.addEventListener("click", async (event) => {
      onShowTable();
    });

  doc
    .getElementById(`zotero-prefpane-${config.addonRef}-best-speed-button`)
    ?.addEventListener("click", async (event) => {
      const button = event.target as HTMLButtonElement;
      button.disabled = true;
      try {
        const bestUrl = await bestSpeedBaseUrl();
        setPref("translatorSource", bestUrl);
        addon.data.prefs?.window.alert(
          getString("info-best-speed-source-updated", {
            args: { source: bestUrl },
          }),
        );
      } catch (error) {
        ztoolkit.log(`select best speed source failed: ${error}`);
        addon.data.prefs?.window.alert(
          getString("info-best-speed-source-failed"),
        );
      } finally {
        button.disabled = false;
      }
    });

  renderMetadataSources(doc);
  const testButton = doc.getElementById(
    "jasminum-llm-test",
  ) as HTMLButtonElement;
  testButton.addEventListener("click", async () => {
    if (testButton.disabled) return;
    const status = doc.getElementById("jasminum-llm-test-result")!;
    const value = (id: string) =>
      (doc.getElementById(id) as HTMLInputElement).value;
    const apiKey = value("jasminum-llm-api-key").trim();
    const baseURL = value("jasminum-llm-base-url").trim().replace(/\/+$/, "");
    const model = value("jasminum-llm-model").trim();
    let client;
    try {
      client = getConfiguredLLMClient({
        baseURL,
        apiKey,
        model,
      });
    } catch (error) {
      status.textContent = (error as Error).message;
      return;
    }
    testButton.disabled = true;
    status.textContent = getString("llm-test-running");
    try {
      const result = await client.createJSONCompletion<{ ok: boolean }>({
        systemPrompt: 'This is a connection test. Return {"ok":true}.',
        prompt: 'Return {"ok":true}.',
        responseFormat: {
          name: "connection_test",
          schema: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
            additionalProperties: false,
          },
        },
      });
      status.textContent = getString(
        result?.ok === true ? "llm-test-success" : "llm-test-invalid-response",
      );
    } catch (error) {
      const failure = error as {
        message?: string;
        status?: number;
        xmlhttp?: { status?: number; responseText?: string };
      } | null;
      const httpStatus = failure?.status ?? failure?.xmlhttp?.status;
      let detail = failure?.message || String(error);
      const responseText = failure?.xmlhttp?.responseText;
      if (responseText) {
        try {
          const body = JSON.parse(responseText);
          const message = body?.error?.message ?? body?.message;
          if (typeof message === "string") detail += `\n${message}`;
        } catch {
          // Keep the original exception when the response is not JSON.
        }
      }
      if (httpStatus) detail = `HTTP ${httpStatus}\n${detail}`;
      if (apiKey) detail = detail.split(apiKey).join("[REDACTED]");
      status.textContent = `${getString("llm-test-failed")}\n${detail}`;
    } finally {
      testButton.disabled = false;
    }
  });
  doc
    .getElementById("jasminum-metadata-source-panel")
    ?.addEventListener("popupshowing", (event) => {
      if (event.target === event.currentTarget) renderMetadataSources(doc);
    });
  doc
    .querySelector(
      `#zotero-prefpane-${config.addonRef}-pdf-match-folder-button`,
    )
    ?.addEventListener("click", async (e) => {
      const path = await new ztoolkit.FilePicker(
        getString("select-download-folder"),
        "folder",
        [],
      ).open();
      if (path) setPref("pdfMatchFolder", path);
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-show-remote-help-qr`)
    ?.addEventListener("click", async () => {
      await openRemoteHelpDialog();
    });

  // doc
  //   .querySelector(
  //     `#zotero-prefpane-${config.addonRef}-install-wps-plugin-button`,
  //   )
  //   ?.addEventListener("click", async (e) => {
  //     ztoolkit.getGlobal("window").alert("等待更新");
  //   });
}
