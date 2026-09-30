import { config } from "../../package.json";
import { getLocaleID } from "../utils/locale";
import {
  mergeName,
  splitName,
  updateCNKICite,
  importAttachmentsFromFolder,
  handleAttachmentMenu,
} from "./tools";
import { isChineseTopAttachment, isChinsesSnapshot } from "../utils/detect";

const registeredMenuIDs: string[] = [];

function canRetrieveMetadata(item: Zotero.Item) {
  return isChineseTopAttachment(item) || isChinsesSnapshot(item);
}

export function registerMenu() {
  unregisterMenu();

  const itemMenuID = Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-item-menu`,
    pluginID: config.addonID,
    target: "main/library/item",
    menus: [
      {
        menuType: "submenu",
        l10nID: getLocaleID("menu-metadata"),
        icon: `chrome://${config.addonRef}/content/icons/icon.png`,
        onShowing: (_event, context) => {
          const items = context.items ?? [];
          context.setVisible(
            items.length > 0 && items.every(canRetrieveMetadata),
          );
        },
        menus: [
          {
            menuType: "menuitem",
            l10nID: getLocaleID("menuitem-retrieveMetadata"),
            icon: `chrome://${config.addonRef}/content/icons/searchCNKI.png`,
            onCommand: async (_event, context) => {
              for (const item of context.items ?? []) {
                await addon.taskRunner.createAndAddTask(
                  item,
                  isChineseTopAttachment(item) ? "attachment" : "snapshot",
                );
              }
            },
          },
        ],
      },
      {
        menuType: "submenu",
        l10nID: getLocaleID("menu-tools"),
        icon: `chrome://${config.addonRef}/content/icons/icon.png`,
        onShowing: (_event, context) => {
          const items = context.items ?? [];
          context.setVisible(
            items.length > 0 &&
              items.every(
                (item) => item.isTopLevelItem() && item.isRegularItem(),
              ),
          );
        },
        menus: [
          {
            menuType: "menuitem",
            l10nID: getLocaleID("menuitem-mergeName"),
            icon: `chrome://${config.addonRef}/content/icons/name.png`,
            onCommand: (_event, context) => {
              for (const item of context.items ?? []) {
                mergeName(item);
              }
            },
          },
          {
            menuType: "menuitem",
            l10nID: getLocaleID("menuitem-splitName"),
            icon: `chrome://${config.addonRef}/content/icons/name.png`,
            onCommand: (_event, context) => {
              for (const item of context.items ?? []) {
                splitName(item);
              }
            },
          },
          {
            menuType: "menuitem",
            l10nID: getLocaleID("menuitem-updateCNKICite"),
            icon: `chrome://${config.addonRef}/content/icons/cite.png`,
            onCommand: async (_event, context) => {
              await updateCNKICite(context.items ?? []);
            },
          },
          {
            menuType: "menuitem",
            l10nID: getLocaleID("menuitem-find-attachment"),
            icon: `chrome://${config.addonRef}/content/icons/attachment-search.svg`,
            onCommand: async () => {
              await handleAttachmentMenu("item");
            },
          },
        ],
      },
    ],
  });
  if (itemMenuID) registeredMenuIDs.push(itemMenuID);

  const collectionMenuID = Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-collection-menu`,
    pluginID: config.addonID,
    target: "main/library/collection",
    menus: [
      {
        menuType: "menuitem",
        l10nID: getLocaleID("menuitem-find-attachment"),
        icon: `chrome://${config.addonRef}/content/icons/attachment-search.svg`,
        onShowing: (_event, context) => {
          context.setVisible(!!context.collectionTreeRow?.isCollection());
        },
        onCommand: async () => {
          await handleAttachmentMenu("collection");
        },
      },
      {
        menuType: "menuitem",
        l10nID: getLocaleID("menuitem-import-attachments"),
        icon: `chrome://${config.addonRef}/content/icons/folder-import.svg`,
        onShowing: (_event, context) => {
          context.setVisible(!!context.collectionTreeRow?.isCollection());
        },
        onCommand: async () => {
          await importAttachmentsFromFolder();
        },
      },
    ],
  });
  if (collectionMenuID) registeredMenuIDs.push(collectionMenuID);
}

export function unregisterMenu() {
  for (const menuID of registeredMenuIDs) {
    Zotero.MenuManager.unregisterMenu(menuID);
  }
  registeredMenuIDs.length = 0;
}
