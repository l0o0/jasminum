import { config } from "../../package.json";

export { isWindowAlive, showPop };

/**
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * @param win
 */
function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

function showPop(
  msg: string,
  type: "success" | "fail" = "success",
  time = 1500,
  progress = 100,
) {
  new ztoolkit.ProgressWindow(config.addonName, {
    closeOnClick: true,
    closeTime: time,
  })
    .createLine({
      text: msg,
      type: type,
      progress: progress,
    })
    .show();
}
