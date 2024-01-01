import ZoteroToolkit from "zotero-plugin-toolkit/dist/index";
import { ColumnOptions } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import hooks from "./hooks";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    // ztoolkit: MyToolkit;
    ztoolkit: ZoteroToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      // columns: Array<ColumnOptions>;
      // rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
    cookiebox: any;
    CNDB: string[];
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      // ztoolkit: new MyToolkit(),
      ztoolkit: new ZoteroToolkit(),
      cookiebox: new MyCookieSandbox(),
      CNDB: [
        "CNKI",
        "WeiPu",
        "Wanfang Data",
        "SuperLib",
        "中国知网CNKI",
        "维普",
        "万方",
        "全国图书馆联盟",
      ],
    };
    this.hooks = hooks;
    this.api = {};
  }
}

/**
 * Alternatively, import toolkit modules you use to minify the plugin size.
 *
 * Steps to replace the default `ztoolkit: ZoteroToolkit` with your `ztoolkit: MyToolkit`:
 *
 * 1. Uncomment this file's line 30:            `ztoolkit: new MyToolkit(),`
 *    and comment line 31:                      `ztoolkit: new ZoteroToolkit(),`.
 * 2. Uncomment this file's line 10:            `ztoolkit: MyToolkit;` in this file
 *    and comment line 11:                      `ztoolkit: ZoteroToolkit;`.
 * 3. Uncomment `./typing/global.d.ts` line 12: `declare const ztoolkit: import("../src/addon").MyToolkit;`
 *    and comment line 13:                      `declare const ztoolkit: import("zotero-plugin-toolkit").ZoteroToolkit;`.
 *
 * You can now add the modules under the `MyToolkit` class.
 */

import { BasicTool, unregister } from "zotero-plugin-toolkit/dist/basic";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import { MyCookieSandbox } from "./utils/cookiebox";

export class MyToolkit extends BasicTool {
  UI: UITool;
  PreferencePane: PreferencePaneManager;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.PreferencePane = new PreferencePaneManager(this);
  }

  unregisterAll() {
    unregister(this);
  }
}

export default Addon;
