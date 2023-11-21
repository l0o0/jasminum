import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { addBookmarkItem } from "./bookmark";
import {
  searchCNKIMetadata,
  searchCNKIMetadataMenu,
  updateCiteCSSCI,
} from "./cnki";
import {
  concatName,
  concatNameMenu,
  manualSetLanguage,
  manualSetLanguageMenu,
  splitNameMenu,
  splitSemicolonNames,
} from "./tools";
import { isCNKIFile } from "./ui";

function example(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any) {
    try {
      ztoolkit.log(`Calling example ${target.name}.${String(propertyKey)}`);
      return original.apply(this, args);
    } catch (e) {
      ztoolkit.log(`Error in example ${target.name}.${String(propertyKey)}`, e);
      throw e;
    }
  };
  return descriptor;
}

export class BasicExampleFactory {
  @example
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any }
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    const notifierID = Zotero.Notifier.registerObserver(callback, [
      "tab",
      "item",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      (e: Event) => {
        this.unregisterNotifier(notifierID);
      },
      false
    );
  }

  @example
  static itemAddedNotifier(addedItems: Zotero.Item[]) {
    let items: Zotero.Item[];
    if (getPref("autoupdate")) {
      items = addedItems.filter((i) => isCNKIFile(i));
      ztoolkit.log(`add ${items.length} items`);
      searchCNKIMetadata(items);
    }
    // Split or merge name
    if (!getPref("zhnamesplit")) {
      items = addedItems.filter((i) =>
        addon.data.CNDB.includes(i.getField("libraryCatalog") as string)
      );
      concatName(items);
    }
    // Add bookmark after new PDF is attached.
    if (getPref("autobookmark")) {
      addedItems.forEach((i) => {
        const parentItem = i.parentItem;
        if (
          i.parentID &&
          Zotero.ItemTypes.getName(parentItem!.itemTypeID) == "thesis" &&
          parentItem!.getField("libraryCatalog") == "CNKI" &&
          i.attachmentContentType == "application/pdf"
        ) {
          addBookmarkItem(i);
        }
      });
    }
    // // Set default language field
    // if (getPref("autolanguage")) {
    //   items = addedItems.filter((i) => i.isRegularItem());
    //   manualSetLanguage(items);
    // }
  }

  @example
  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }

  @example
  static registerPrefs() {
    const prefOptions = {
      pluginID: config.addonID,
      src: rootURI + "chrome/content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/icon.png`,
      defaultXUL: true,
    };
    ztoolkit.PreferencePane.register(prefOptions);
  }
}

export class KeyExampleFactory {
  @example
  static registerShortcuts() {
    const keysetId = `${config.addonRef}-keyset`;
    const cmdsetId = `${config.addonRef}-cmdset`;
    const cmdSmallerId = `${config.addonRef}-cmd-smaller`;
    // Register an event key for Alt+L
    ztoolkit.Shortcut.register("event", {
      id: `${config.addonRef}-key-larger`,
      key: "L",
      modifiers: "alt",
      callback: (keyOptions) => {
        addon.hooks.onShortcuts("larger");
      },
    });
    // Register an element key using <key> for Alt+S
    ztoolkit.Shortcut.register("element", {
      id: `${config.addonRef}-key-smaller`,
      key: "S",
      modifiers: "alt",
      xulData: {
        document,
        command: cmdSmallerId,
        _parentId: keysetId,
        _commandOptions: {
          id: cmdSmallerId,
          document,
          _parentId: cmdsetId,
          oncommand: `Zotero.${config.addonInstance}.hooks.onShortcuts('smaller')`,
        },
      },
    });
    // Here we register an conflict key for Alt+S
    // just to show how the confliction check works.
    // This is something you should avoid in your plugin.
    ztoolkit.Shortcut.register("event", {
      id: `${config.addonRef}-key-smaller-conflict`,
      key: "S",
      modifiers: "alt",
      callback: (keyOptions) => {
        ztoolkit.getGlobal("alert")("Smaller! This is a conflict key.");
      },
    });
    // Register an event key to check confliction
    ztoolkit.Shortcut.register("event", {
      id: `${config.addonRef}-key-check-conflict`,
      key: "C",
      modifiers: "alt",
      callback: (keyOptions) => {
        addon.hooks.onShortcuts("confliction");
      },
    });
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: "Example Shortcuts: Alt+L/S/C",
        type: "success",
      })
      .show();
  }

  @example
  static exampleShortcutLargerCallback() {
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: "Larger!",
        type: "default",
      })
      .show();
  }

  @example
  static exampleShortcutSmallerCallback() {
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: "Smaller!",
        type: "default",
      })
      .show();
  }

  @example
  static exampleShortcutConflictingCallback() {
    const conflictingGroups = ztoolkit.Shortcut.checkAllKeyConflicting();
    new ztoolkit.ProgressWindow("Check Key Conflicting")
      .createLine({
        text: `${conflictingGroups.length} groups of conflicting keys found. Details are in the debug output/console.`,
      })
      .show(-1);
    ztoolkit.log(
      "Conflicting:",
      conflictingGroups,
      "All keys:",
      ztoolkit.Shortcut.getAll()
    );
  }
}

export class UIExampleFactory {
  // @example
  // static registerStyleSheet() {
  //   const styles = ztoolkit.UI.createElement(document, "link", {
  //     properties: {
  //       type: "text/css",
  //       rel: "stylesheet",
  //       href: `chrome://${config.addonRef}/content/zoteroPane.css`,
  //     },
  //   });
  //   document.documentElement.appendChild(styles);
  //   document
  //     .getElementById("zotero-item-pane-content")
  //     ?.classList.add("makeItRed");
  // }

  @example
  static registerRightClickMenuPopup() {
    const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
    ztoolkit.Menu.register(
      "item",
      {
        tag: "menu",
        id: "jasminum-popup-menu-cnki",
        label: getString("menu-CNKI-label"),
        icon: iconBaseUrl + "cnki.png",
        children: [
          {
            tag: "menuitem",
            id: "jasminum-itemmenu-searchCNKI",
            label: getString("menu-CNKI-update-label"),
            commandListener: (ev) => searchCNKIMetadataMenu("items"),
            icon: iconBaseUrl + "searchCNKI.png",
          },
          {
            tag: "menuitem",
            id: "jasminum-itemmenu-updateCiteCSSCI",
            label: getString("menu-CNKI-updateCiteCSSCI-label"),
            commandListener: (ev) => updateCiteCSSCI(),
            icon: iconBaseUrl + "cssci.png",
          },
          // {
          //   tag: "menuitem",
          //   id: "jasminum-itemmenu-attachment",
          //   label: getString("menu-CNKI-attachment-label"),
          //   oncommand: "alert('menu.CNKI.attachment.label')",
          //   icon: iconBaseUrl + "pdf.png",
          // },
          {
            tag: "menuitem",
            id: "jasminum-itemmenu-bookmark",
            label: getString("menu-CNKI-addBookmark-label"),
            commandListener: (ev) => addBookmarkItem(),
            icon: iconBaseUrl + "bookmark.png",
          },
        ],
      },
    );

    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "jasminum-popup-menu-tools",
      label: getString("menu-tools-label"),
      icon: iconBaseUrl + "tools.png",
      children: [
        {
          tag: "menuitem",
          label: getString("menu-tools-namesplit-label"),
          commandListener: (ev) => splitNameMenu("items"),
          icon: iconBaseUrl + "name.png",
        },
        {
          tag: "menuitem",
          label: getString("menu-tools-namemerge-label"),
          commandListener: (ev) => concatNameMenu("items"),
          icon: iconBaseUrl + "name.png",
        },
        {
          tag: "menuitem",
          label: getString("menu-tools-semicolonNamesSplit-label"),
          commandListener: (ev) => splitSemicolonNames("items"),
          icon: iconBaseUrl + "name.png",
        },
        // {
        //   tag: "menuitem",
        //   label: getString("menu-tools-removeDot-label"),
        //   commandListener: (ev) => removeComma("items"),
        //   icon: iconBaseUrl + "bullet_yellow.png",
        // },
        // {
        //     tag: "menuitem",
        //     label: getString("menu-tools-bacthsetlanguage-label"),
        //     commandListener: (ev) => autoSetLanguage("items"),
        //     icon: iconBaseUrl + 'language.png'
        // },
        {
          tag: "menuitem",
          label: getString("menu-tools-manualsetlanguage-label"),
          commandListener: (ev) => manualSetLanguageMenu("items"),
          icon: iconBaseUrl + "flag-china.png",
        },
        // {
        //   tag: "menuitem",
        //   label: getString("menu-tools-dateformatter-label"),
        //   commandListener: (ev) => dateFormatter("items"),
        //   icon: iconBaseUrl + "date.png",
        // },
      ],
    });
  }

  @example
  static async registerExtraColumn() {
    await ztoolkit.ItemTree.register(
      "cnki-citations",
      getString("cnkicite-field-label"),
      (
        field: string,
        unformatted: boolean,
        includeBaseMapped: boolean,
        item: Zotero.Item
      ) => {
        const cite = ztoolkit.ExtraField.getExtraField(
          item,
          "CNKICite"
        ) as string;
        return cite ? cite : "";
      },
      {
        iconPath: `chrome://${config.addonRef}/content/icons/cssci.png`,
      }
    );
    await ztoolkit.ItemTree.register(
      "cnki-journal-type",
      getString("cssci-field-label"),
      (
        field: string,
        unformatted: boolean,
        includeBaseMapped: boolean,
        item: Zotero.Item
      ) => {
        const sci = ztoolkit.ExtraField.getExtraField(item, "CSSCI") as string;
        return sci ? sci : "";
      },
      {
        iconPath: `chrome://${config.addonRef}/content/icons/cssci.png`,
      }
    );
  }
}