import { config } from "../../../package.json";
import { isWindowAlive } from "../../utils/window";

// Warning:
// The remote-help URL and bundled QR image below are official, copyrighted
// assets. Do not replace, redistribute, or modify them without explicit
// authorization from the copyright holder.
// 警告：
// 下方远程协助链接与内置二维码图片属于官方受版权保护内容，未经版权所有者明确授权，
// 不得随意替换、修改、再分发或挪作他用。
export const REMOTE_HELP_URL =
  "https://item.taobao.com/item.htm?ft=t&id=1035769863393";
export const REMOTE_HELP_QR_URL = `chrome://${config.addonRef}/content/icons/tqrcode.png`;
export const REMOTE_HELP_QR_ACTION = "jasminum://remote-help-qr";

export async function openRemoteHelpDialog(): Promise<void> {
  const remoteHelpWindow = addon.data.windows.remoteHelpQR;
  if (isWindowAlive(remoteHelpWindow)) {
    remoteHelpWindow.focus();
    return;
  }

  const windowArgs = {
    _initPromise: Zotero.Promise.defer(),
    remoteHelpURL: REMOTE_HELP_URL,
    qrImageURL: REMOTE_HELP_QR_URL,
  };
  const win = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/preferences-remote-help.xhtml`,
    "_blank",
    "chrome,centerscreen,resizable=no,width=360,height=480",
    windowArgs,
  );
  await windowArgs._initPromise.promise;
  addon.data.windows.remoteHelpQR = win!;
}
