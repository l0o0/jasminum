import { text } from "stream/consumers";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { isChineseTopAttachment } from "./menu";
import { splitChineseName } from "./tools";

export function registerNotifier() {
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
  const notifierID = Zotero.Notifier.registerObserver(callback, ["item"]);

  Zotero.Plugins.addObserver({
    shutdown: ({ id }) => {
      if (id === config.addonID) unregisterNotifier(notifierID);
    },
  });
}

function unregisterNotifier(notifierID: string) {
  Zotero.Notifier.unregisterObserver(notifierID);
}

function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // ztoolkit.log(event, type, ids, extraData);
  if (event == "add" && type == "item") {
    ids.map(async (id) => {
      const item = Zotero.Items.get(id);

      if (getPref("autoupdate")) {
        if (isChineseTopAttachment(item)) {
          await addon.scraper.search(item);
        }
      }

      if (getPref("zhnamesplit")) {
        splitChineseName(item);
      }
    });
  }
}

export async function registerExtraColumnWithCustomCell() {
  const registeredDataKey = Zotero.ItemTreeManager.registerColumn({
    dataKey: "CNKIcitation",
    label: getString("CNKIcitation"),
    pluginID: config.addonID,
    dataProvider: (item, dataKey) => {
      // 网友提供的特殊字符，方便排序
      return ztoolkit.ExtraField.getExtraField(item, "citation") || "\u2068";
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

  const notifierID = Zotero.Notifier.registerObserver(
    {
      notify: async (
        event: string,
        type: string,
        ids: Array<string> | number[],
        extraData: { [key: string]: any },
      ) => {
        const id = ids[0] as string;
        if (type == "tab" && extraData[id].type == "reader") {
          if (type) return;
          ztoolkit.log("====start");
          ztoolkit.log(event);
          ztoolkit.log(type);
          ztoolkit.log(ids);
          ztoolkit.log(extraData);
          if (event == "select" || event == "load") {
            // Only pdf
            const reader = Zotero.Reader.getByTabID(id);
            ztoolkit.log("wait", new Date());
            // This should add a waiting process.
            // @ts-ignore - not typed
            await Zotero.Promise.delay(5000);
            ztoolkit.log("wait 2", new Date());
            const doc = reader._iframeWindow?.document;

            if (doc && doc.querySelector("#j-outline-button") === null) {
              const originOutlineButton = doc.querySelector("#viewOutline");
              ztoolkit.log(originOutlineButton);
              const newButton = ztoolkit.UI.createElement(doc, "button", {
                namespace: "html",
                id: "j-outline-button",
                classList: ["toolbar-button"],
                styles: {
                  border: "2px solid gray",
                },
                properties: { title: "测试" },
                attributes: {
                  tabindex: "-1",
                  role: "tab",
                  "aria-selected": "false",
                  "aria-controls": "j-outline-viewer",
                },
                listeners: [
                  {
                    type: "click",
                    listener: (e) => {
                      ztoolkit.log("Button.click");
                      const d = (e.target! as HTMLButtonElement).ownerDocument;
                      const viewer =
                        d.getElementById("j-outline-viewer")?.parentElement;
                      if (!viewer?.classList.contains("hidden")) {
                        ztoolkit.log("Already display");
                      } else {
                        d
                          .getElementById("thumbnailsView")
                          ?.parentElement?.classList.toggle("hidden", true);
                        d
                          .getElementById("annotationsView")
                          ?.classList.toggle("hidden", true);
                        d
                          .getElementById("outlineView")
                          ?.parentElement?.classList.toggle("hidden", true);
                        viewer?.classList.toggle("hidden", false);
                        ztoolkit.log("Display jasminum outline.");
                      }
                    },
                  },
                ],
              });

              const newPanel = ztoolkit.UI.createElement(doc, "div", {
                classList: ["viewWrapper", "hidden"],
                children: [
                  {
                    tag: "div",
                    id: "j-outline-viewer",
                    classList: ["outline-view"],
                    properties: { innerText: "jasminum outline test" },
                    attributes: {
                      tabindex: "-1",
                      "data-tabstop": "1",
                      role: "tabpanel",
                      "aria-labelledby": "j-outline-button",
                    },
                  },
                ],
              });
              ztoolkit.log(newButton);
              ztoolkit.log(newPanel);
              doc
                .querySelector("#viewOutline")
                ?.parentElement?.appendChild(newButton);
              doc.querySelector("#sidebarContent")?.appendChild(newPanel);

              const hiddenMyOutline = (e: Event) => {
                ztoolkit.log(e.target as HTMLButtonElement, "clicked.");
                doc
                  .getElementById("j-outline-viewer")
                  ?.parentElement?.classList.toggle("hidden", true);
              };

              doc
                .getElementById("viewThumbnail")
                ?.addEventListener("click", hiddenMyOutline);
              doc
                .getElementById("viewAnnotations")
                ?.addEventListener("click", hiddenMyOutline);
              doc
                .getElementById("viewOutline")
                ?.addEventListener("click", hiddenMyOutline);
            }
          }
        }
      },
    },
    ["tab"],
  );
  // window.setTimeout(async () => {
  //   // 可能会报错，但是没关系
  //   await this.registerReaderButton(await ztoolkit.Reader.getReader() as _ZoteroTypes.ReaderInstance)
  // })
  ztoolkit.getGlobal("window").addEventListener(
    "unload",
    (e: Event) => {
      Zotero.Notifier.unregisterObserver(notifierID);
    },
    false,
  );
}
