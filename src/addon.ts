import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { Progress } from "./modules/progress";
import { VirtualizedTableHelper } from "zotero-plugin-toolkit";
import { MyCookieSandbox } from "./utils/cookiebox";
import { getOutlineFromPDF } from "./modules/outline/outline";
import { TaskRunner } from "./utils/task";
import { requestDocument } from "./utils/http";
import { openRemoteHelpDialog } from "./modules/preferences/remoteHelp";
import {
  HeadlessBrowserOptions,
  HeadlessBrowserService,
} from "./utils/headlessBrowser";

export type AddonAPI = {
  getOutlineFromPDF: typeof getOutlineFromPDF;
  requestDocument: typeof requestDocument;
  openRemoteHelpDialog: typeof openRemoteHelpDialog;
  HeadlessBrowserService: typeof HeadlessBrowserService;
  createHeadlessBrowser: (
    options?: HeadlessBrowserOptions,
  ) => HeadlessBrowserService;
};

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    progress: Progress;
    windows: Record<string, Window>;
    translators: {
      window?: Window;
      helper?: VirtualizedTableHelper;
      rows: TableRow[];
      allRows: TableRow[];
      selected?: string;
      updating?: boolean;
    };
    myCookieSandbox: MyCookieSandbox;
    isImportingAttachments: boolean;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: AddonAPI;
  public taskRunner: TaskRunner;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: createZToolkit(),
      progress: new Progress(),
      windows: {},
      translators: {
        rows: [],
        allRows: [],
        updating: false,
      },
      myCookieSandbox: new MyCookieSandbox(),
      isImportingAttachments: false,
    };
    this.hooks = hooks;
    this.api = {
      getOutlineFromPDF,
      requestDocument,
      openRemoteHelpDialog,
      HeadlessBrowserService,
      createHeadlessBrowser: (options?: HeadlessBrowserOptions) =>
        new HeadlessBrowserService(options),
    };
    this.taskRunner = new TaskRunner();
  }
}

export default Addon;
