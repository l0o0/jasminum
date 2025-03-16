import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { isChineseTopAttachment } from "./menu";
import { getOutline, outline_css, renderTree, ICONS } from "./outline";
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
        ztoolkit.log("====start");
        ztoolkit.log(event);
        ztoolkit.log(type);
        ztoolkit.log(ids);
        ztoolkit.log(extraData);
        const id = ids[0] as string;
        if (
          (event == "select" || event == "load") &&
          type == "tab" &&
          extraData[id].type == "reader"
        ) {
          // Only pdf
          const reader = Zotero.Reader.getByTabID(id);
          if (reader._item.attachmentContentType != "application/pdf") {
            ztoolkit.log("Only support PDF reader.");
            return;
          }
          ztoolkit.log("wait", new Date());
          // This should add a waiting process.
          // @ts-ignore - not typed
          await Zotero.Promise.delay(5000);
          ztoolkit.log("wait 2", new Date());
          const doc = reader._iframeWindow?.document;
          reader._iframeWindow!.outline_data = { id: id, data: "jasminum" };
          if (doc) {
            // Register CSS
            ztoolkit.log("** Register css");
            const styles = ztoolkit.UI.createElement(doc, "style", {
              namespace: "html",
              properties: {
                textContent: outline_css,
              },
              attributes: { type: "text/css" },
            });
            doc.querySelector("head")!.appendChild(styles);

            // Theme Update
            reader._iframeWindow
              ?.matchMedia("(prefers-color-scheme: dark)")!
              .addEventListener("change", (e: MediaQueryListEvent) => {
                if (e.matches) {
                  doc.documentElement.setAttribute("data-theme", "dark");
                } else {
                  doc.documentElement.setAttribute("data-theme", "light");
                }
              });
          }
          const joutline = await getOutline(reader);
          if (!joutline) {
            ztoolkit.log("No outline.");
            return;
          }
          ztoolkit.log("++joutline", joutline);

          if (doc && doc.querySelector("#j-outline-button") === null) {
            const newButton = ztoolkit.UI.createElement(doc, "button", {
              namespace: "html",
              id: "j-outline-button",
              classList: ["toolbar-button"],
              properties: { innerHTML: ICONS.outline },
              attributes: {
                title: getString("outline"),
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
                    ztoolkit.log(e);
                    const d = (e.target! as HTMLButtonElement).ownerDocument;
                    const viewer =
                      d.getElementById("j-outline-viewer")?.parentElement;
                    // 显示工具栏
                    d
                      .getElementById("j-outline-toolbar")
                      ?.classList.toggle("j-outline-hidden", false);
                    if (!viewer?.classList.contains("hidden")) {
                      ztoolkit.log("Already display");
                    } else {
                      // 按钮的激活状态
                      d
                        .getElementById("viewThumbnail")
                        ?.classList.toggle("active", false);
                      d
                        .getElementById("viewOutline")
                        ?.classList.toggle("active", false);
                      d
                        .getElementById("viewAnnotations")
                        ?.classList.toggle("active", false);
                      d
                        .getElementById("j-outline-button")
                        ?.classList.toggle("active", true);
                      // 书签内容显示
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
                      (e.target as Element).classList.toggle("active", true);

                      ztoolkit.log("Display jasminum outline.");
                    }
                  },
                },
              ],
            });

            // 原始书签和笔记列表点击时会不显示书签内容，这里修复
            doc
              .querySelector("#viewOutline")
              ?.addEventListener("click", (e) => {
                doc
                  .querySelector("#outlineView")
                  ?.parentElement?.classList.toggle("hidden", false);
              });
            doc
              .querySelector("#viewAnnotations")
              ?.addEventListener("click", (e) => {
                doc
                  .querySelector("#annotationsView")
                  ?.classList.toggle("hidden", false);
              });

            // 窗口启动时为黑暗主题
            if (
              reader._iframeWindow!.matchMedia("(prefers-color-scheme: dark)")!
                .matches === true
            ) {
              doc.documentElement.setAttribute("data-theme", "dark");
            }
            // 将书签按照添加到工具按钮栏上
            doc
              .querySelector("#viewOutline")
              ?.parentElement?.appendChild(newButton);
            const newPanel = renderTree(doc, joutline);
            // Click item to jump to page
            // newPanel.addEventListener("click", (e: Event) => {
            //   ztoolkit.log("click to jump");
            //   ztoolkit.log(e.target);
            //   if ((e.target as Element).tagName === "SPAN") {
            //     const page = parseInt(
            //       (e.target as Element).getAttribute("page")!,
            //     );
            //     // @ts-ignore - not typed
            //     reader._internalReader._primaryView._iframeWindow.PDFViewerApplication.page =
            //       page;
            //   }
            // });
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
