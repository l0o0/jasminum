import { isWindowAlive } from "../../utils/window";
import { getLastUpdatedFromFile, getLastUpdatedMap } from "../translators";
import { config } from "../../../package.json";
import { getString } from "../../utils/locale";

async function onWindowLoad(_window: Window) {
  addon.data.translators.window = _window;
  await updateRowData();
  const columns = [
    {
      dataKey: "filename",
      label: getString("th-filename"),
      fixedWidth: false,
    },
    {
      dataKey: "label",
      label: getString("th-label"),
      fixedWidth: false,
    },
    {
      dataKey: "localUpdateTime",
      label: getString("th-local-update-time"),
      fixedWidth: true,
      width: 145,
    },
    {
      dataKey: "remoteUpdateTime",
      label: getString("th-remote-update-time"),
      fixedWidth: true,
      width: 145,
    },
  ];
  addon.data.translators.helper = new ztoolkit.VirtualizedTable(
    addon.data.translators.window,
  )
    .setContainerId("table-container")
    .setProp({
      id: "translators-table",
      columns,
      showHeader: true,
      staticColumns: false,
    })
    .setProp("getRowCount", () => addon.data.translators.rows.length)
    .setProp(
      "getRowData",
      (index: number) => addon.data.translators.rows[index],
    )
    .setProp("onColumnSort", (columnIndex, ascending) => {
      // columnIndex from sort event is always valid, so assert its type
      const sortKey = columns[columnIndex].dataKey as keyof TableRow;
      addon.data.translators.rows.sort((a, b) => {
        return ascending > 0
          ? a[sortKey].localeCompare(b[sortKey])
          : b[sortKey].localeCompare(a[sortKey]);
      });
      updateTableUI();
    })
    .render();
  updateTableUI();
}

async function updateRowData() {
  const map = await getLastUpdatedMap(addon.data.env !== "development");
  ztoolkit.log("updateRowData", map);
  const rows: TableRow[] = [];
  for (const [filename, { label, lastUpdated }] of Object.entries(map)) {
    rows.push({
      filename,
      label,
      localUpdateTime: (await getLastUpdatedFromFile(filename)) || "",
      remoteUpdateTime: lastUpdated,
    });
  }
  addon.data.translators.rows = rows;
}

async function updateTableUI() {
  return new Promise<void>((resolve) => {
    addon.data.translators.helper?.render(undefined, () => {
      resolve();
    });
  });
}

function bindEvents(doc: Document) {
  doc.getElementById("github-link")?.addEventListener("click", (event) => {
    Zotero.launchURL("https://github.com/l0o0/translators_CN");
  });

  const searchBox = doc.getElementById("search-box");
  searchBox?.addEventListener("command", async (event) => {
    ztoolkit.log("search", event);
    const value = (event.target as XULTextBoxElement).value;
    if (!value) return;
    addon.data.translators.rows = addon.data.translators.rows.filter((row) => {
      function ignoreCaseIncludes(str: string, search: string) {
        return str.toLowerCase().includes(search.toLowerCase());
      }
      return (
        ignoreCaseIncludes(row.filename, value) ||
        ignoreCaseIncludes(row.label, value)
      );
    });
    await updateTableUI();
  });

  searchBox?.focus();

  doc
    .getElementById("request-new-translator")
    ?.addEventListener("click", (event) => {
      Zotero.launchURL(
        "https://github.com/l0o0/translators_CN/issues/new?template=T3_new_translator.yaml",
      );
    });

  doc
    .getElementById("report-translator-bug")
    ?.addEventListener("click", (event) => {
      Zotero.launchURL(
        "https://github.com/l0o0/translators_CN/issues/new?template=T1_bug.yaml",
      );
    });
}

export async function onShowTable() {
  if (isWindowAlive(addon.data.translators.window)) {
    addon.data.translators.window!.focus();
    await updateRowData();
    await updateTableUI();
  } else {
    const windowArgs = {
      _initPromise: Zotero.Promise.defer(),
    };
    const win = Zotero.getMainWindow().openDialog(
      `chrome://${config.addonRef}/content/preferences-translators.xhtml`,
      "_blank",
      "chrome,centerscreen,resizable",
      windowArgs,
    );
    await windowArgs._initPromise.promise;
    addon.data.translators.window = win!;
    await updateRowData();
    onWindowLoad(addon.data.translators.window);
    bindEvents(addon.data.translators.window!.document);
  }
}
