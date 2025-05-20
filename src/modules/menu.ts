import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import {
  mergeName,
  splitName,
  updateCNKICite,
  importAttachmentsFromFolder,
  handleAttachmentMenu,
} from "./tools";
import { isChineseTopAttachment, isChinsesSnapshot } from "../utils/detect";

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
    commandListener: async () => {
      const items = Zotero.getActiveZoteroPane().getSelectedItems();
      for (const item of items) {
        await addon.taskRunner.createAndAddTask(
          item,
          isChineseTopAttachment(item) ? "attachment" : "snapshot",
        );
      }
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
  {
    tag: "menuitem",
    label: "find-attachment",
    icon: `chrome://${config.addonRef}/content/icons/attachment-search.svg`,
    commandListener: () => {
      handleAttachmentMenu("item");
    },
  },
];

export function registerMenu() {
  const separatorMenu: MenuitemOptions = {
    tag: "menuseparator",
    id: `${config.addonRef}-separator`,
    isHidden: (_event) =>
      Zotero.getActiveZoteroPane()
        .getSelectedItems()
        .some((item) => {
          return !(
            isChineseTopAttachment(item) ||
            isChinsesSnapshot(item) ||
            (item.isTopLevelItem() && item.isRegularItem())
          );
        }),
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

  const attachmentMenu: MenuitemOptions = {
    tag: "menuitem",
    label: getString("menuitem-find-attachment"),
    id: `${config.addonRef}-attachment-menu`,
    icon: `chrome://${config.addonRef}/content/icons/attachment-search.svg`,
    commandListener: () => {
      handleAttachmentMenu("collection");
    },
    isHidden: () =>
      Zotero.getActiveZoteroPane().getSelectedCollection() === undefined
        ? true
        : false,
  };

  const importAttachmentMenu: MenuitemOptions = {
    tag: "menuitem",
    label: getString("menuitem-import-attachments"),
    id: `${config.addonRef}-attachment-menu`,
    icon: `chrome://${config.addonRef}/content/icons/folder-import.svg`,
    commandListener: async () => {
      await importAttachmentsFromFolder();
    },
    isHidden: () =>
      Zotero.getActiveZoteroPane().getSelectedCollection() === undefined
        ? true
        : false,
  };

  ztoolkit.Menu.register("collection", attachmentMenu);
  ztoolkit.Menu.register("collection", importAttachmentMenu);
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
