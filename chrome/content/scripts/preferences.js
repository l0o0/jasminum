initPref = async function () {
    Components.utils.import("resource://gre/modules/osfile.jsm");
    var jasminum_pdftk_path = Zotero.Prefs.get("jasminum.pdftkpath");
    document.getElementById("jasminum-pdftk-path").value = jasminum_pdftk_path;
    var fileExist = await Zotero.Jasminum.checkPath();
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
    var fileExist = await Zotero.Jasminum.checkPath();
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
    var array = await OS.File.read(desPath);
    var decoder = new TextDecoder();
    var js = decoder.decode(array).split("\n").slice(0, 20);
    var lastUpdate = js.filter((line) => line.includes('"lastUpdated": '));
    var group = lastUpdate[0].match(
        /(\d{4}\-\d{1,}\-\d{1,}\s\d{1,}:\d{1,}:\d{1,})/g
    );
    return group ? group[0] : "---";
};

initTranslatorPanel = async function () {
    var tabpanel = document.getElementById("zotero-prefpane-translators-tab");
    tabpanel.removeChild(tabpanel.firstChild);
    var data = getUpdates();
    var listitem, listcell, button;
    var listbox = document.createElement("listbox");
    listbox.setAttribute("id", "translators-listbox");
    listbox.setAttribute("flex", "1");

    var listhead = document.createElement("listhead");
    var listheader = document.createElement("listheader");
    listheader.setAttribute("label", "Translators");
    listhead.appendChild(listheader);
    listheader = document.createElement("listheader");
    listheader.setAttribute("label", "Current");
    listhead.appendChild(listheader);
    listheader = document.createElement("listheader");
    listheader.setAttribute("label", "UpdateTime");
    listhead.appendChild(listheader);
    listheader = document.createElement("listheader");
    listheader.setAttribute("label", "Update");
    listhead.appendChild(listheader);
    listbox.appendChild(listhead);

    var listcols = document.createElement("listcols");
    var listcol = document.createElement("listcol");
    listcol.setAttribute("flex", "1");
    listcols.appendChild(listcol);
    listcol = document.createElement("listcol");
    listcol.setAttribute("width", "150");
    listcols.appendChild(listcol);
    listcol = document.createElement("listcol");
    listcol.setAttribute("width", "150");
    listcols.appendChild(listcol);
    listcol = document.createElement("listcol");
    listcol.setAttribute("width", "100");
    listcols.appendChild(listcol);
    listbox.appendChild(listcol);

    for (let f of data) {
        listitem = document.createElement("listitem");
        listitem.setAttribute("allowevents", "true");
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", `${data[f].description}(${f})`);
        listcell.setAttribute("id", label + "1");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        var localLastUpdate = await getLastUpdateFromFile(label);
        listcell.setAttribute("label", localLastUpdate);
        listcell.setAttribute("id", label + "2");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", "---");
        listcell.setAttribute("id", label + "3");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("id", label + "4");
        button = document.createElement("button");
        button.setAttribute("tooltiptext", "Click to update");
        button.setAttribute("disabled", true);
        button.setAttribute("id", label + "6");
        button.setAttribute("oncommand", `updateTranslator('${f}');`);
        listcell.setAttribute("id", label + "5");
        button.setAttribute("image", "chrome://jasminum/skin/information.png");
        button.setAttribute("id", label + "5button");
        listcell.appendChild(button);
        listitem.appendChild(listcell);

        listbox.appendChild(listitem);
    }
    tabpanel.appendChild(listbox, tabpanel.firstChild);
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
        refreshTime(updateJson);
    } catch (e) {
        alert("获取更新信息失败，请稍后重试\n" + e);
    }
};

refreshTime = function (updateJson) {
    for (let key in updateJson) {
        let cell = document.getElementById(key + "3");
        let button = document.getElementById(key + "6");
        if (cell) {
            cell.setAttribute("label", updateJson[key].lastUpdated);
            button.setAttribute("disable", false);
        }
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
        alert(`${label}.js 下载失败,请稍后尝试重新下载\n` + e);
        return false;
    }
};

updateIcon = async function (label, status) {
    var button = document.getElementById(label + "5button");
    if (status) {
        button.setAttribute("image", "chrome://jasminum/skin/accept.png");
        var current = document.getElementById(label + "2");
        var currentLastUpdate = await getLastUpdateFromFile(label);
        Zotero.debug("---------------" + currentLastUpdate);
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
    Object.keys(labelCN).forEach(
        async (label) => await updateTranslator(label)
    );
};
