import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { mergeChineseName, splitChineseName } from "./tools";

/**
 * Return true when item is a top level Chinese PDF/CAJ item.
 */
export function isChineseTopAttachment(item: Zotero.Item): boolean {
  return (
    item.isAttachment() &&
    item.isTopLevelItem() &&
    /.*[\u4e00-\u9fff].*\.(pdf|caj|kdh|nh)$/i.test(item.attachmentFilename)
  );
}

// CNKI Snapshot attachment item
// CNKI Webpage top level item.
export function isChinsesSnapshot(item: Zotero.Item): boolean {
  return (
    (item.isSnapshotAttachment() &&
      item.getField("title").includes("- 中国知网")) ||
    (item.isTopLevelItem() &&
      item.itemType == "webpage" &&
      item.getField("title").includes("- 中国知网"))
  );
}

const metaddataMenuItems: MenuitemOptions[] = [
  {
    tag: "menuitem",
    label: "retrieveMetadata",
    icon: `chrome://${config.addonRef}/content/icons/searchCNKI.png`,
    // @ts-ignore - not typed
    onShowing: () => {
      ztoolkit.log("searchCNKI onshowing");
    },
    isHidden: (_elm, _ev) =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return !(isChineseTopAttachment(item) || isChinsesSnapshot(item));
        }),
    commandListener: () => {
      // @ts-ignore - The plugin instance is not typed.
      Zotero[config.addonInstance].scraper.search(
        Zotero.getActiveZoteroPane().getSelectedItems()[0],
      );
    },
  },
  {
    tag: "menuitem",
    label: "retrieveMetadataForBook",
    icon: `chrome://${config.addonRef}/content/icons/searchCNKI.png`,
    isHidden: () => true,
    // getVisibility: (_elm, _ev) =>
    //   Zotero.getActiveZoteroPane()
    //     .getSelectedItems()
    //     .some((item) => {
    //       return isChineseTopAttachment(item);
    //     }),
    commandListener: () => {
      // @ts-ignore - The plugin instance is not typed.
      Zotero[config.addonInstance].scraper.search(
        Zotero.getActiveZoteroPane().getSelectedItems()[0],
        { taskType: "book" },
      );
    },
  },
];

const toolsMenuItems: MenuitemOptions[] = [
  {
    tag: "menuitem",
    label: "mergeName",
    icon: `chrome://${config.addonRef}/content/icons/name.png`,
    getVisibility: (_elm, _ev) =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return item.isTopLevelItem();
        }),
    commandListener: () => {
      for (const item of Zotero.getActiveZoteroPane().getSelectedItems()) {
        mergeChineseName(item);
      }
    },
  },
  {
    tag: "menuitem",
    label: "splitName",
    icon: `chrome://${config.addonRef}/content/icons/name.png`,
    getVisibility: (_elm, _ev) =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return item.isTopLevelItem();
        }),
    commandListener: () => {
      for (const item of Zotero.getActiveZoteroPane().getSelectedItems()) {
        splitChineseName(item);
      }
    },
  },
];

export function registerMenu() {
  const separatorMenu: MenuitemOptions = {
    tag: "menuseparator",
    id: `${config.addonRef}-separator`,
  };
  const metadataMenu: MenuitemOptions = {
    tag: "menu",
    label: getString("menu-metadata"),
    id: `${config.addonRef}-metadata-menu`,
    icon: `chrome://${config.addonRef}/content/icons/icon.png`,
    children: metaddataMenuItems.map((subOption) => {
      const label = subOption.label as string;
      subOption.id = `${config.addonRef}-menuitem-${label}`;
      subOption.label = getString(`menuitem-${label}`);
      return subOption;
    }),
    isHidden: (e) =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return !(isChineseTopAttachment(item) || isChinsesSnapshot(item));
        }),
  };
  const toolsMenu: MenuitemOptions = {
    tag: "menu",
    label: getString("menu-tools"),
    id: `${config.addonRef}-tools-menu`,
    icon: `chrome://${config.addonRef}/content/icons/icon.png`,
    children: toolsMenuItems.map((subOption) => {
      const label = subOption.label as string;
      subOption.id = `${config.addonRef}-menuitem-${label}`;
      subOption.label = getString(`menuitem-${label}`);
      return subOption;
    }),
    isHidden: () =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return !(item.isTopLevelItem() && item.isRegularItem());
        }),
  };
  ztoolkit.Menu.register("item", separatorMenu);
  ztoolkit.Menu.register("item", metadataMenu);
  ztoolkit.Menu.register("item", toolsMenu);
  // ztoolkit.Menu.register("item", {
  //   tag: "menuitem",
  //   label: "TEST",
  //   commandListener: async () => {
  //     // downloadTranslator(true);
  //     const item = Zotero.getActiveZoteroPane().getSelectedItems()[0];
  //     const title = await getPDFTitle(item.id);
  //     ztoolkit.log(title);
  //   },
  // });
  ztoolkit.Menu.register("collection", metadataMenu);
}
