import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { Scraper } from "./modules/services";
import { Progress } from "./modules/progress";
import { VirtualizedTableHelper } from "zotero-plugin-toolkit";
import { MyCookieSandbox } from "./utils/cookiebox";
import { test } from "./modules/test";

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
      selected?: string;
    };
    myCookieSandbox?: MyCookieSandbox;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;
  public scraper: Scraper;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: createZToolkit(),
      progress: new Progress(),
      windows: {},
      translators: {
        rows: [],
      },
      myCookieSandbox: new MyCookieSandbox(),
    };
    this.hooks = hooks;
    this.api = { test: test };
    this.scraper = new Scraper();
  }
}

export default Addon;
