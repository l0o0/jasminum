initPref = async function () {
    Components.utils.import("resource://gre/modules/osfile.jsm");
    var jasminum_pdftk_path = Zotero.Prefs.get("jasminum.pdftkpath");
    document.getElementById("jasminum-pdftk-path").value = jasminum_pdftk_path;
    var fileExist = await Zotero.Jasminum.Scrape.checkPath();
    pathCheckIcon(fileExist);
    // initTranslatorPanel();
};

// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker
choosePath = async function () {
    Zotero.debug("** Jasminum choose Path");
    // var fp = new FilePicker();
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
        Components.interfaces.nsIFilePicker
    );

    fp.init(window, "选择pdftk/pdftk.exe所在目录", fp.modeGetFolder);
    fp.appendFilters(fp.filterAll);

    var returnValue = await new Zotero.Promise(function (resolve) {
        fp.open((returnConstant) => resolve(returnConstant));
    });
    if (returnValue != fp.returnOK) {
        Zotero.debug("Ops");
        return false;
    }
    Zotero.debug("** Jasminum " + fp.file.path);
    Zotero.Prefs.set("jasminum.pdftkpath", fp.file.path);
    document.getElementById("jasminum-pdftk-path").value = fp.file.path;
    var fileExist = await Zotero.Jasminum.Scrape.checkPath();
    pathCheckIcon(fileExist);
};

pathCheckIcon = function (fileExist) {
    document.getElementById("path-accept").hidden = !fileExist;
    document.getElementById("path-error").hidden = fileExist;
    Zotero.debug("** Jasminum Icon");
    Zotero.debug("1" + document.getElementById("path-accept").hidden);
    Zotero.debug("2" + document.getElementById("path-error").hidden);
};

getLastUpdateFromFile = async function (label) {
    var desPath = OS.Path.join(
        Zotero.Prefs.get("dataDir"),
        "translators",
        label
    );
    Zotero.debug(desPath);
    if (!(await OS.File.exists(desPath))) {
        Zotero.debug(label + " not exists");
        return "---";
    }
    var array = await OS.File.read(desPath);
    var decoder = new TextDecoder();
    var js = decoder.decode(array).split("\n").slice(0, 20);
    var lastUpdate = js.filter((line) => line.includes('"lastUpdated": '));
    var group = lastUpdate[0].match(
        /(\d{4}\-\d{1,}\-\d{1,}\s\d{1,}:\d{1,}:\d{1,})/g
    );
    Zotero.debug("***" + group[0]);
    return group ? group[0] : "---";
};

initTranslatorPanel = async function () {
    var listbox = document.getElementById("translators-listbox");
    var count = listbox.childElementCount;
    var data = await getUpdates();
    // Zotero.debug(data);
    var listitem, listcell, button;
    if (count == 2) {
        // Create table in panel
        for (let label in data) {
            Zotero.debug(label);
            listitem = document.createElement("listitem");
            listitem.setAttribute("allowevents", "true");
            listcell = document.createElement("listcell");
            listcell.setAttribute("label", `${data[label].description}`);
            listcell.setAttribute("tooltiptext", label);
            listcell.setAttribute("id", label + "1");
            listitem.appendChild(listcell);
            listcell = document.createElement("listcell");
            var localLastUpdate = await getLastUpdateFromFile(label);
            Zotero.debug(localLastUpdate);
            listcell.setAttribute("label", localLastUpdate);
            listcell.setAttribute("id", label + "2");
            listitem.appendChild(listcell);
            listcell = document.createElement("listcell");
            listcell.setAttribute("label", `${data[label].lastUpdated}`);
            listcell.setAttribute("id", label + "3");
            listitem.appendChild(listcell);
            listcell = document.createElement("listcell");
            listcell.setAttribute("id", label + "4");
            button = document.createElement("button");
            // button.setAttribute("disabled", true);
            button.setAttribute("id", label + "6");
            button.setAttribute("oncommand", `updateTranslator('${label}');`);
            listcell.setAttribute("id", label + "5");
            if (localLastUpdate == data[label].lastUpdated) {
                button.setAttribute(
                    "image",
                    "chrome://jasminum/skin/accept.png"
                );
                button.setAttribute("tooltiptext", "不必更新");
            } else {
                button.setAttribute(
                    "image",
                    "chrome://jasminum/skin/information.png"
                );
                button.setAttribute("tooltiptext", "点击下载更新");
            }
            button.setAttribute("id", label + "5button");
            listcell.appendChild(button);
            listitem.appendChild(listcell);

            listbox.appendChild(listitem);
        }
    } else {
        // Update lastUpdate time
        for (let label in data) {
            var localLastUpdate = await getLastUpdateFromFile(label);
            listcell = document.getElementById(label + "2");
            listcell.setAttribute("label", localLastUpdate);
            listcell = document.getElementById(label + "3");
            listcell.setAttribute("label", data[label].lastUpdated);
        }
    }
};

getUpdates = async function () {
    var url = "https://www.linxingzhong.top/zt";
    var postData = {
        key: "zoteroKey",
    };
    var headers = { "Content-Type": "application/json" };
    // Maybe need to set max retry in this post request.
    var resp = await Zotero.HTTP.request("POST", url, {
        body: JSON.stringify(postData),
        headers: headers,
    });
    try {
        var updateJson = JSON.parse(resp.responseText);
        return updateJson;
    } catch (e) {
        this.Utils.showPopup(
            "翻译器更新失败",
            `获取翻译器更新信息失败，请稍后重试，${e}`,
            1
        )
    }
};

downloadTo = async function (label) {
    let cacheFile = Zotero.getTempDirectory();
    var filename = label;
    cacheFile.append(filename);
    if (cacheFile.exists()) {
        cacheFile.remove(false);
    }
    var url = `https://gitee.com/l0o0/translators_CN/raw/master/translators/${label}`;
    try {
        var resp = await Zotero.HTTP.request("GET", url);
        let encoder = new TextEncoder();
        let array = encoder.encode(resp.responseText);
        await OS.File.writeAtomic(cacheFile.path, array, {
            tmpPath: cacheFile.path + ".tmp",
        });
        var desPath = OS.Path.join(
            Zotero.Prefs.get("dataDir"),
            "translators",
            OS.Path.basename(cacheFile.path)
        );
        await OS.File.move(cacheFile.path, desPath);
        return true;
    } catch (e) {
        this.Utils.showPopup(
            "翻译器下载失败",
            `${label}.js 下载失败，请稍后重试`,
            1
        )
    }
};

updateIcon = async function (label, status) {
    var button = document.getElementById(label + "5button");
    if (status) {
        button.setAttribute("image", "chrome://jasminum/skin/accept.png");
        var current = document.getElementById(label + "2");
        var currentLastUpdate = await getLastUpdateFromFile(label);
        // Zotero.debug("---------------" + currentLastUpdate);
        current.setAttribute("label", currentLastUpdate);
    } else {
        button.setAttribute("image", "chrome://jasminum/skin/exclamation.png");
    }
};

updateTranslator = async function (label) {
    var status = await downloadTo(label);
    if (status) {
        updateIcon(label, status);
    }
};

updateAll = async function () {
    var data = await getUpdates();
    Object.keys(data).forEach(async (label) => await updateTranslator(label));
    this.Utils.showPopup(
        "更新完成",
        "所有翻译器已经完成更新"
    )
};
