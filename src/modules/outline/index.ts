import { addOutlineToReader } from "./outline";

export async function registerOutline(tabID?: string) {
  if (!tabID) {
    ztoolkit.log("Need to add outline to opeened reader.");
    if (ztoolkit.getGlobal("Zotero_Tabs").selectedType != "reader") {
      ztoolkit.log("Zotero opened a non-reader tab in startup.");
      return;
    }
    const tabID = ztoolkit.getGlobal("Zotero_Tabs").selectedID;
  }
  const reader = Zotero.Reader.getByTabID(tabID as string);
  ztoolkit.log("Init " + reader._isReaderInitialized);
  await reader._initPromise;
  ztoolkit.log("Init " + reader._isReaderInitialized);
  // Only pdf
  if (reader._item.attachmentContentType != "application/pdf") {
    ztoolkit.log("Only support PDF reader.");
    return;
  }
  // This should add a waiting process.
  // @ts-ignore - not typed
  const doc = reader._iframeWindow?.document;

  let toggleButton: HTMLElement | null = null;
  let waiting = 0;
  while (!toggleButton && waiting < 5000) {
    // @ts-ignore - Not typed
    await Zotero.Promise.delay(200);
    if (doc) {
      toggleButton = doc.getElementById("sidebarToggle");
      if (toggleButton) {
        ztoolkit.log("Toggle button shows");
      }
    }
    ztoolkit.log(`Waiting ${waiting}`);
    waiting += 200;
  }

  // Reader sidebarContainer is open
  if (doc && doc.getElementById("sidebarContainer")) {
    addOutlineToReader(reader);
  } else if (doc && doc.getElementById("sidebarContainer") === null) {
    doc
      ?.getElementById("sidebarToggle")
      ?.addEventListener("click", (ev: Event) => {
        ztoolkit.log("outline is added by toggle click");
        addOutlineToReader(reader);
      });
  } else {
    ztoolkit.log("Nothing to do with outline");
  }
}
