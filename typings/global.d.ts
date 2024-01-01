declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ZoteroPane: _ZoteroTypes.ZoteroPane;
  Zotero_Tabs: typeof Zotero_Tabs;
  window: Window;
  document: Document;
  ztoolkit: typeof ztoolkit;
  addon: typeof addon;
};

// declare const ztoolkit: import("../src/addon").MyToolkit;
declare const ztoolkit: import("zotero-plugin-toolkit").ZoteroToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

declare class Localization {}

declare interface Window {
  openDialog(
    url: string,
    target?: string,
    features?: string,
    ...args: any
  ): Window;
}

// Customized types
declare interface MyCreator {
  firstName: string;
  lastName: string;
  creatorType: string;
  fieldMode: number;
  creatorTypeID?: number;
}

declare interface CNKIID {
  dbcode: string;
  dbname: string;
  filename: string;
}

declare interface CNKIRow {
  id: CNKIID;
  title: string;
  url: string;
  citation?: string;
}
