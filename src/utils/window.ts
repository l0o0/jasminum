import { config } from "../../package.json";
import { waitUtilAsync } from "./wait";

/**
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * @param win
 */
export function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

/**
 * Ensures that a given promise resolves within a specified timeout.
 * If the promise does not resolve within the timeout, it rejects with an error.
 * @param promise - The promise to wait for.
 * @param timeout - The maximum time to wait in milliseconds.
 * @param message - The error message to reject with if the promise does not resolve within the timeout.
 */
export async function waitNoMoreThan<T>(
  promise: Promise<T>,
  timeout: number = 3000,
  message: string = "Timeout",
) {
  let resolved = false;

  return Promise.any([
    promise.then((result) => {
      resolved = true;
      return result;
    }),
    // @ts-ignore - Promise delay is not typed.
    Zotero.Promise.delay(timeout).then(() => {
      if (resolved) return;
      throw new Error(message);
    }),
  ]);
}

export function findWindow(type: string) {
  const enumerator = Services.wm.getEnumerator(type);
  if (enumerator.hasMoreElements()) {
    // In this case, getNext will always return a window
    const win = enumerator.getNext() as Window;
    ztoolkit.log(`found window by type: ${type}, ${win.location.href}`);
    return win;
  }
  ztoolkit.log(`not found window by type: ${type}`);
  return null;
}

export function observeWindowLoad(
  uri: string,
  callback: (win: Window) => unknown,
) {
  // After the window opens, wait for it to load
  const loadObserver = function (event: Event) {
    event.originalTarget?.removeEventListener("load", loadObserver, false);
    const href = (event.target as Window)?.location.href;
    ztoolkit.log(`window loaded: ${href}`);

    if (href != uri) {
      return;
    }
    const win = event.target?.ownerGlobal;
    // Give window code time to run on load
    win?.setTimeout(function () {
      callback(win);
    });
  };
  // Ensure that the window is opened before listening for load
  const winObserver = {
    observe: function (subject: Window, topic: string, data: any) {
      if (topic != "domwindowopened") return;
      subject.addEventListener("load", loadObserver, false);
    },
  } as nsIObserver;

  Services.ww.registerNotification(winObserver);
  // Unregister notifier when addon is disabled
  Zotero.Plugins.addObserver({
    shutdown: ({ id }) => {
      if (id === config.addonID)
        Services.ww.unregisterNotification(winObserver);
    },
  });
}

export async function waitElmLoaded(
  doc: Document,
  selector: string,
  timeout = 10000,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    waitUtilAsync(() => !!doc.querySelector(selector), 100, timeout)
      .then(() => {
        ztoolkit.log(`element ${selector} in ${doc.location.href} loaded`);
        resolve(true);
      })
      .catch(() => {
        ztoolkit.log(
          `timeout waiting for element ${selector} in ${doc.location.href}`,
        );
        reject(false);
      });
  });
}
