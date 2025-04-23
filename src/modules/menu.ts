import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { mergeName, splitName, updateCNKICite } from "./tools";
import { getPDFTitle } from "../utils/pdfParser";

/**
 * Return true when item is a top level Chinese PDF/CAJ item.
 */
export function isChineseTopAttachment(item: Zotero.Item): boolean {
  return (
    item.isAttachment() &&
    item.isTopLevelItem() &&
    /\p{Unified_Ideograph}.*\.(pdf|caj|kdh|nh)$/iu.test(
      item.attachmentFilename.replace(/[和等年月日]/g, ""),
    )
  );
}

export function isChineseTopItem(item: Zotero.Item): boolean {
  return (
    item.isRegularItem() &&
    item.isTopLevelItem() &&
    /\p{Unified_Ideograph}/iu.test(item.getField("title"))
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
    isHidden: (_elm, _ev) =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return !(isChineseTopAttachment(item) || isChinsesSnapshot(item));
        }),
    commandListener: () => {
      // @ts-ignore - The plugin instance is not typed.
      Zotero[config.addonInstance].scraper.search(
        Zotero.getActiveZoteroPane().getSelectedItems(),
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
      );
    },
  },
];

const toolsMenuItems: MenuitemOptions[] = [
  {
    tag: "menuitem",
    label: "mergeName",
    icon: `chrome://${config.addonRef}/content/icons/name.png`,
    commandListener: () => {
      for (const item of Zotero.getActiveZoteroPane().getSelectedItems()) {
        mergeName(item);
      }
    },
  },
  {
    tag: "menuitem",
    label: "splitName",
    icon: `chrome://${config.addonRef}/content/icons/name.png`,
    commandListener: () => {
      for (const item of Zotero.getActiveZoteroPane().getSelectedItems()) {
        splitName(item);
      }
    },
  },
  {
    tag: "menuitem",
    label: "updateCNKICite",
    icon: `chrome://${config.addonRef}/content/icons/cite.png`,
    commandListener: async () => {
      await updateCNKICite(Zotero.getActiveZoteroPane().getSelectedItems());
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
    isHidden: (_event) =>
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

  // Disable in collection
  // ztoolkit.Menu.register("collection", metadataMenu);
}
