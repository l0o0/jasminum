import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { isChineseTopAttachment } from "../utils/detect";
import { registerOutline } from "./outline";
import { splitName } from "./tools";

/**
 * A wrap for Zotero.Notifier.registerObserver,
 * which will automatically unregister the observer when the addon is disabled.
 */
function registerNotifier(
  onNotify: (
    event: string,
    type: string,
    ids: number[] | string[],
    extraData: { [key: string]: any },
  ) => void,
  types: _ZoteroTypes.Notifier.Type[],
) {
  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: number[] | string[],
      extraData: { [key: string]: any },
    ) => {
      if (!addon?.data.alive) {
        unregisterNotifier(notifierID);
        return;
      }
      onNotify(event, type, ids, extraData);
    },
  };

  // Register the callback in Zotero as an item observer
  const notifierID = Zotero.Notifier.registerObserver(callback, types);

  Zotero.Plugins.addObserver({
    shutdown: ({ id }) => {
      if (id === config.addonID) unregisterNotifier(notifierID);
    },
  });
}

function unregisterNotifier(notifierID: string) {
  Zotero.Notifier.unregisterObserver(notifierID);
}

/**
 * Register notifiers for the addon at startup hooks.
 */
export function registerNotifiers() {
  registerNotifier(onAddItem, ["item"]);
  // registerNotifier(onOpenTab, ["tab"]);
}

async function onAddItem(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // ztoolkit.log(`notify: add item, event: ${event}, type: ${type}, ids: ${ids}`);
  if (event !== "add" || type !== "item") return;
  for (const id of ids) {
    const item = Zotero.Items.get(id);

    if (getPref("autoUpdateMetadata")) {
      if (isChineseTopAttachment(item)) {
        await addon.taskRunner.createAndAddTask(item, "attachment");
      }
    }

    if (getPref("autoSplitName")) {
      splitName(item);
    }
  }
}

// TODO: Complete the notifier.
// async function onOpenTab(
//   event: string,
//   type: string,
//   ids: Array<string | number>,
//   extraData: { [key: string]: any },
// ) {
//   const id = ids[0];
//   if (
//     (event == "select" || event == "load") &&
//     type == "tab" &&
//     extraData[id].type == "reader"
//   ) {
//     ztoolkit.log("onOpenTab", event, type, extraData);
//     if (getPref("enableBookmark")) {
//       await registerOutline(id as string);
//     } else {
//       ztoolkit.log("Jasminum bookmark is disabled");
//     }
//   }
// }

export async function registerExtraColumnWithCustomCell() {
  const registeredDataKey = Zotero.ItemTreeManager.registerColumn({
    dataKey: "CNKIcitation",
    label: getString("CNKIcitation"),
    pluginID: config.addonID,
    dataProvider: (item, dataKey) => {
      // 网友提供的特殊字符，方便排序
      return ztoolkit.ExtraField.getExtraField(item, "CNKICite") || "\u2068";
    },
    // @ts-ignore - Not typed.
    // renderCell(index, data, column, isFirstColumn, doc) {
    //   const span = doc.createElementNS("http://www.w3.org/1999/xhtml", "span");
    //   span.className = `cell ${column.className}`;
    //   span.title = getString("CNKIcitation");
    //   span.innerText = data == "" ? null : data;
    //   return span;
    // },
  });
}

// For Outline register.
export function registerTab() {
  Zotero.Reader.registerEventListener(
    "renderToolbar",
    tabRegisterCallback,
    config.addonID,
  );

  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    (event: any) => {
      ztoolkit.log(event);
      event.append("<div>Jasminum</div>");
    },
  );
}

async function tabRegisterCallback(event: any) {
  if (getPref("enableBookmark")) {
    const { reader } = event;
    await registerOutline(reader.tabID);
  } else {
    ztoolkit.log("Jasminum bookmark is disabled");
  }
}
