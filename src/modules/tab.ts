import { getPref } from "../utils/prefs";
import { registerOutline } from "./outline";
import { config } from "../../package.json";

export function registerTab() {
  Zotero.Reader.registerEventListener(
    "renderToolbar",
    tabRegisterCallback,
    config.addonID,
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
