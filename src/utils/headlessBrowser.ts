ChromeUtils.importESModule("chrome://zotero/content/actors/ActorManager.mjs");

const { BlockingObserver } = ChromeUtils.importESModule(
  "chrome://zotero/content/BlockingObserver.mjs",
);
const { E10SUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/E10SUtils.sys.mjs",
);

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_POLL_INTERVAL = 100;
const DEFAULT_ACTOR_TIMEOUT = 5000;
const SANDBOXED_SCRIPTS = 0x80;
const HEADLESS_ACTOR_NAME = "JasminumHeadless";

function getAddonRootURI() {
  const addonRootURI =
    (globalThis as any).rootURI
    // bootstrap.js passes rootURI on the addon sandbox global
    // but it is not guaranteed to be exposed as a globalThis property.
    || ((globalThis as any)._globalThis && (globalThis as any)._globalThis.rootURI)
    // eslint-disable-next-line no-undef
    || (typeof rootURI !== "undefined" ? rootURI : undefined);
  if (!addonRootURI) {
    throw new Error("Jasminum rootURI is not available");
  }
  return String(addonRootURI).replace(/\/?$/, "/");
}

function getHeadlessActorURL() {
  return `${getAddonRootURI()}chrome/content/actors/JasminumHeadlessChild.mjs`;
}

type JSONPrimitive = string | number | boolean | null;
type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };
type ChannelInfo = {
  responseStatus: number;
  responseStatusText: string;
};
type BrowserLike = XULBrowserElement & {
  remoteType?: string;
  currentURI?: nsIURI;
  docShell?: Record<string, any>;
  browsingContext?: BrowsingContext & Record<string, any>;
  changeRemoteness: (options: { remoteType: string }) => void;
  construct: () => void;
  messageManager: MessageSender | null;
};

type HeadlessEvaluateResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: {
        name: string;
        message: string;
        stack?: string;
      };
    };

export type HeadlessBrowserOptions = {
  allowJavaScript?: boolean;
  blockRemoteResources?: boolean;
  cookieSandbox?: Zotero.CookieSandbox;
  docShell?: Record<string, unknown>;
};

export type HeadlessLoadOptions = {
  requireSuccessfulStatus?: boolean;
  allowInteractiveAfter?: number | false;
};

export type HeadlessWaitOptions = {
  timeout?: number;
  pollInterval?: number;
  visible?: boolean;
};

export type HeadlessFillOptions = {
  clear?: boolean;
  dispatchChange?: boolean;
  blur?: boolean;
};

export type HeadlessPressOptions = {
  selector?: string;
  key: string;
  code?: string;
  keyCode?: number;
};

export class HeadlessBrowserService {
  private _browser: XULBrowserElement | null = null;
  private _destroyed = false;
  private _blockingObserver?: InstanceType<typeof BlockingObserver>;
  private _createdPromise: Promise<void>;
  private _options: HeadlessBrowserOptions;

  constructor(options: HeadlessBrowserOptions = {}) {
    this._options = options;
    this._createdPromise = this._createBrowser();
  }

  static async using<T>(
    callback: (browser: HeadlessBrowserService) => Promise<T>,
    options: HeadlessBrowserOptions = {},
  ): Promise<T> {
    const browser = new HeadlessBrowserService(options);
    try {
      return await callback(browser);
    } finally {
      browser.destroy();
    }
  }

  get rawBrowser() {
    return this._browser;
  }

  async load(source: string, options: HeadlessLoadOptions = {}) {
    await this._createdPromise;
    const browser = this._browserLike();
    const uri = this._normalizeURI(source);

    ztoolkit.log(`HeadlessBrowser.load: ${uri}`);

    const oa = E10SUtils.predictOriginAttributes({ browser });
    const remoteType = E10SUtils.getRemoteTypeForURI(
      uri,
      true,
      false,
      E10SUtils.DEFAULT_REMOTE_TYPE,
      null,
      oa,
    );

    if (browser.remoteType !== remoteType) {
      if (remoteType === E10SUtils.NOT_REMOTE) {
        browser.removeAttribute("remote");
        browser.removeAttribute("remoteType");
      } else {
        browser.setAttribute("remote", "true");
        browser.setAttribute("remoteType", remoteType);
      }
      browser.changeRemoteness({ remoteType });
      browser.construct();
    }

    this._configureBrowser();
    await this._waitForFrameLoader();

    const loaded = await new Promise<boolean>(async (resolve, reject) => {
      const timeoutID = setTimeout(() => {
        cleanup();
        reject(new Error(`Page never loaded in headless browser: ${uri}`));
      }, DEFAULT_ACTOR_TIMEOUT);
      const webProgress = this._browsingContext().webProgress;
      const sameDocumentFlag =
        Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT ?? 0;

      const listener = {
        onLocationChange(
          progress: nsIWebProgress,
          _request: any,
          location: nsIURI,
          flags: number,
        ) {
          if (!progress.isTopLevel) {
            return;
          }
          if (flags & sameDocumentFlag) {
            return;
          }
          if (location.spec === "about:blank" && uri !== "about:blank") {
            return;
          }
          cleanup();
          resolve(true);
        },
        QueryInterface: ChromeUtils.generateQI([
          "nsIWebProgressListener",
          "nsISupportsWeakReference",
        ]),
      };

      const cleanup = () => {
        clearTimeout(timeoutID);
        try {
          webProgress.removeProgressListener(listener);
        } catch (_error) {}
      };

      webProgress.addProgressListener(
        listener,
        Ci.nsIWebProgress.NOTIFY_LOCATION,
      );

      try {
        const loadURISuccess = await this._windowGlobal()
          .getActor("PageData")
          .sendQuery("loadURI", { uri });
        if (!loadURISuccess) {
          cleanup();
          reject(new Error(`Failed to load URI in headless browser: ${uri}`));
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    if (!loaded) {
      throw new Error(`HeadlessBrowserService failed to load: ${uri}`);
    }

    await this.waitForDocument({
      allowInteractiveAfter: options.allowInteractiveAfter ?? false,
    });

    if (options.requireSuccessfulStatus) {
      const { channelInfo } = (await this.getPageData(["channelInfo"])) as {
        channelInfo?: ChannelInfo | null;
      };
      if (
        channelInfo &&
        (channelInfo.responseStatus < 200 || channelInfo.responseStatus >= 400)
      ) {
        const response = `${channelInfo.responseStatus} ${channelInfo.responseStatusText}`;
        throw new (Zotero.HTTP as any).UnexpectedStatusException(
          { status: channelInfo.responseStatus },
          uri,
          `Invalid response ${response} for ${uri}`,
        );
      }
    }

    return this;
  }

  async waitForDocument({
    allowInteractiveAfter = false,
  }: {
    allowInteractiveAfter?: number | false;
  } = {}) {
    await this._createdPromise;
    return this._windowGlobal()
      .getActor("DocumentIsReady")
      .sendQuery("waitForDocument", { allowInteractiveAfter });
  }

  async waitForSelector(selector: string, options: HeadlessWaitOptions = {}) {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const visible = options.visible ?? false;
    const startedAt = Date.now();

    ztoolkit.log(
      `HeadlessBrowser.waitForSelector: selector="${selector}" timeout=${timeout}`,
    );

    while (Date.now() - startedAt <= timeout) {
      const doc = await this.getDocument();
      const matchCount = doc.querySelectorAll(selector).length;

      if (matchCount > 0) {
        // @ts-ignore - Not typed.
        await Zotero.Promise.delay(pollInterval * 8);
        return {
          found: true,
          selector,
          url: doc.location.href,
          readyState: doc.readyState,
          elapsed: Date.now() - startedAt,
          matchCount,
          visibleCount: visible ? 0 : matchCount,
        };
      }

      // @ts-ignore - Not typed.
      await Zotero.Promise.delay(pollInterval);
    }

    const doc = await this.getDocument();
    const matchCount = doc.querySelectorAll(selector).length;
    throw new Error(
      `Timed out waiting for selector: ${selector} after ${timeout}ms (url=${doc.location.href}, readyState=${doc.readyState}, matches=${matchCount})`,
    );
  }

  async waitForURLChange(
    previousURL?: string,
    options: Omit<HeadlessWaitOptions, "visible"> = {},
  ) {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const fromURL = previousURL ?? (await this.getURL());
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeout) {
      const currentURL = await this.getURL();
      if (currentURL !== fromURL) {
        return currentURL;
      }
      // @ts-ignore - Not typed.
      await Zotero.Promise.delay(pollInterval);
    }

    throw new Error(
      `Timed out waiting for URL change from ${fromURL} after ${timeout}ms`,
    );
  }

  async getURL(): Promise<string> {
    await this._createdPromise;
    return this._browserLike().currentURI?.spec || "";
  }

  async click(selector: string) {
    ztoolkit.log(`HeadlessBrowser.click: selector="${selector}"`);
    try {
      const result = await this._sendActorQuery("click", { selector });
      ztoolkit.log("HeadlessBrowser.click: result", result);
      return result;
    } catch (error) {
      ztoolkit.log("HeadlessBrowser.click: error", error);
      throw error;
    }
  }

  async fill(
    selector: string,
    value: string,
    options: HeadlessFillOptions = {},
  ) {
    const payload = {
      selector,
      value,
      clear: options.clear ?? true,
      dispatchChange: options.dispatchChange ?? true,
      blur: options.blur ?? false,
    };
    ztoolkit.log("HeadlessBrowser.fill: payload", payload);
    try {
      const result = await this._sendActorQuery("fill", payload);
      ztoolkit.log("HeadlessBrowser.fill: result", result);
      return result;
    } catch (error) {
      ztoolkit.log("HeadlessBrowser.fill: error", error);
      throw error;
    }
  }

  async press(options: HeadlessPressOptions) {
    ztoolkit.log("HeadlessBrowser.press: payload", options);
    try {
      const result = await this._sendActorQuery("press", options);
      ztoolkit.log("HeadlessBrowser.press: result", result);
      return result;
    } catch (error) {
      ztoolkit.log("HeadlessBrowser.press: error", error);
      throw error;
    }
  }

  async evaluate<T extends JSONValue | undefined = JSONValue>(
    fn:
      | string
      | ((
          window: Window,
          document: Document,
          ...args: JSONValue[]
        ) => T | Promise<T>),
    ...args: JSONValue[]
  ): Promise<T | null> {
    const source = typeof fn === "function" ? fn.toString() : fn;
    ztoolkit.log("HeadlessBrowser.evaluate: source", source);
    ztoolkit.log("HeadlessBrowser.evaluate: args", args);
    const result = (await this._sendActorQuery("evaluate", {
      source,
      args,
    })) as HeadlessEvaluateResult<T | null>;
    ztoolkit.log("HeadlessBrowser.evaluate: raw result", result);

    if (!result.ok) {
      const error = new Error(result.error.message);
      error.name = result.error.name;
      if (result.error.stack) {
        error.stack = result.error.stack;
      }
      throw error;
    }

    return result.value ?? null;
  }

  async getDocument() {
    const { documentHTML, cookie } = (await this.getPageData([
      "documentHTML",
      "cookie",
    ])) as {
      documentHTML: string;
      cookie?: string;
    };
    const doc = new DOMParser().parseFromString(documentHTML, "text/html");
    const docWithLocation = Zotero.HTTP.wrapDocument(doc, await this.getURL());
    return new Proxy(docWithLocation, {
      get(obj, prop) {
        if (prop === "cookie") {
          return cookie;
        }
        return obj[prop as keyof typeof obj];
      },
    });
  }

  async getPageData(props: string[]) {
    await this._createdPromise;
    const actor = this._windowGlobal().getActor("PageData");
    const data: Record<string, unknown> = {};
    for (const prop of props) {
      data[prop] = await actor.sendQuery(prop);
    }
    return data;
  }

  snapshot() {
    return this._windowGlobal().getActor("SingleFile").sendQuery("snapshot");
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    void this._createdPromise.then(() => {
      this._blockingObserver?.unregister(this._requireBrowser());
      this._browser?.remove();
      this._browser = null;
    });
  }

  private async _createBrowser() {
    const doc = Zotero.getMainWindow()?.document;
    if (!doc) {
      throw new Error("HeadlessBrowserService requires the main window to be open");
    }

    const browser = doc.createXULElement("browser");
    browser.setAttribute("type", "content");
    browser.setAttribute("remote", "true");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("disableglobalhistory", "true");
    browser.style.display = "none";
    doc.documentElement.appendChild(browser);

    this._browser = browser;
    this._configureBrowser();
    await this._waitForFrameLoader();

    if (this._options.cookieSandbox) {
      this._options.cookieSandbox.attachToBrowser(browser);
    }

    if (this._options.blockRemoteResources) {
      this._blockingObserver = new BlockingObserver({
        shouldBlock(uri: nsIURI) {
          return uri.scheme !== "file";
        },
      });
      this._blockingObserver.register(browser);
    }
  }

  private _configureBrowser() {
    const browser = this._browserLike();
    const browsingContext = this._browsingContext();
    if (this._options.allowJavaScript === false) {
      browsingContext.sandboxFlags |= SANDBOXED_SCRIPTS;
    } else {
      browsingContext.sandboxFlags &= ~SANDBOXED_SCRIPTS;
    }
    if (browser.docShell && this._options.docShell) {
      Object.assign(browser.docShell, this._options.docShell);
    }
    if (browser.docShell) {
      browser.docShell.allowImages = false;
      browser.docShell.allowContentRetargeting = false;
    }
  }

  private _normalizeURI(source: string) {
    if (/^(file|https?|chrome|resource|blob|data):/.test(source)) {
      return source;
    }
    return Zotero.File.pathToFileURI(source);
  }

  private _requireBrowser() {
    if (!this._browser) {
      throw new Error("Headless browser is not initialized");
    }
    return this._browser;
  }

  private _browserLike() {
    return this._requireBrowser() as BrowserLike;
  }

  private _browsingContext() {
    const browsingContext = this._browserLike().browsingContext;
    if (!browsingContext) {
      throw new Error("Headless browser browsingContext is not ready");
    }
    return browsingContext;
  }

  private _windowGlobal() {
    const currentWindowGlobal = this._browsingContext().currentWindowGlobal;
    if (!currentWindowGlobal) {
      throw new Error("Headless browser window global is not ready");
    }
    return currentWindowGlobal;
  }

  private async _waitForFrameLoader() {
    const browser = this._browserLike();
    if (browser.messageManager) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutID = setTimeout(() => {
        cleanup();
        reject(new Error("Headless browser frame loader was not created"));
      }, DEFAULT_ACTOR_TIMEOUT);

      const onCreated = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        clearTimeout(timeoutID);
        browser.removeEventListener("XULFrameLoaderCreated", onCreated);
      };

      browser.addEventListener("XULFrameLoaderCreated", onCreated, {
        once: true,
      });
    });
  }

  private async _sendActorQuery<T>(command: string, payload: unknown) {
    await this._createdPromise;
    let actor;
    try {
      actor = this._windowGlobal().getActor(HEADLESS_ACTOR_NAME);
    } catch (error) {
      ztoolkit.log("HeadlessBrowser.getActor: error", {
        actorName: HEADLESS_ACTOR_NAME,
        actorURL: getHeadlessActorURL(),
        currentURL: this._browserLike().currentURI?.spec || "",
        error,
      });
      throw error;
    }
    return new Promise<T>((resolve, reject) => {
      let settled = false;

      actor.sendQuery(command, payload).then(
        (value: T) => {
          settled = true;
          resolve(value);
        },
        (error: Error) => {
          settled = true;
          reject(error);
        },
      );

      // @ts-ignore - Not typed.
      Zotero.Promise.delay(DEFAULT_ACTOR_TIMEOUT).then(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(
          new Error(
            `HeadlessBrowser actor query timed out: ${command} after ${DEFAULT_ACTOR_TIMEOUT}ms`,
          ),
        );
      });
    });
  }
}

let headlessActorRegistered = false;

export function registerHeadlessActor() {
  if (headlessActorRegistered) {
    ztoolkit.log("HeadlessBrowser.registerActor: already registered");
    return;
  }

  const actorURL = getHeadlessActorURL();
  ztoolkit.log("HeadlessBrowser.registerActor: start", {
    actorName: HEADLESS_ACTOR_NAME,
    actorURL,
  });

  try {
    ChromeUtils.unregisterWindowActor(HEADLESS_ACTOR_NAME);
  } catch (_error) {}

  try {
    ChromeUtils.registerWindowActor(HEADLESS_ACTOR_NAME, {
      child: {
        esModuleURI: actorURL,
      },
      allFrames: false,
      includeChrome: true,
    });
  } catch (error) {
    ztoolkit.log("HeadlessBrowser.registerActor: failed", error);
    throw error;
  }

  headlessActorRegistered = true;
  ztoolkit.log("HeadlessBrowser.registerActor: success", {
    actorName: HEADLESS_ACTOR_NAME,
    actorURL,
  });
}

export function unregisterHeadlessActor() {
  if (!headlessActorRegistered) {
    return;
  }

  try {
    ChromeUtils.unregisterWindowActor(HEADLESS_ACTOR_NAME);
  } catch (_error) {}

  headlessActorRegistered = false;
}
