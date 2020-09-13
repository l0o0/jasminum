initPref = async function () {
    Components.utils.import("resource://gre/modules/osfile.jsm");
    var jasminum_pdftk_path = Zotero.Prefs.get("jasminum.pdftkpath");
    document.getElementById("jasminum-pdftk-path").value = jasminum_pdftk_path;
    var fileExist = await Zotero.Jasminum.checkPath();
    pathCheckIcon(fileExist);
    initTranslatorPanel();
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

var labelCN = {
    CNKI: "中国知网",
    "Baidu Scholar": "百度学术",
    BiliBili: "哔哩哔哩视频",
    GFSOSO: "谷粉学术",
    Soopat: "Soopat专利",
    SuperLib: "全国图书馆联盟",
    WanFang: "万方学术",
    WeiPu: "维普学术",
    Wenjin: "中国国家图书馆",
};

initTranslatorPanel = async function () {
    var web = new Zotero.Translate.Web();
    var translators = await web._translatorProvider.getAllForType("web");
    var translators = translators.sort((a, b) =>
        a.label.localeCompare(b.label)
    );
    var translatorsCN = translators.filter((t) => t.label in labelCN);
    var listitem, listcell, button;
    var listbox = document.getElementById("translators-listbox");
    for (let translator of translatorsCN) {
        listitem = document.createElement("listitem");
        listitem.setAttribute("allowevents", "true");
        listcell = document.createElement("listcell");
        listcell.setAttribute(
            "label",
            `${labelCN[translator.label]}(${translator.label}.js)`
        );
        listcell.setAttribute("id", translator.label + "1");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", translator.lastUpdated);
        listcell.setAttribute("id", translator.label + "2");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", "---");
        listcell.setAttribute("id", translator.label + "3");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("id", translator.label + "4");
        button = document.createElement("button");
        button.setAttribute(
            "oncommand",
            `updateTranslator('${translator.label}');`
        );
        listcell.setAttribute("id", translator.label + "5");
        button.setAttribute("image", "chrome://jasminum/skin/accept.png");
        button.setAttribute("id", translator.label + "5button");
        listcell.appendChild(button);
        listitem.appendChild(listcell);

        listbox.appendChild(listitem);
    }
};

getUpdates = async function () {
    var url = "https://www.linxingzhong.top/zt";
    var postData = {
        key: "zoteroKey",
    };
    var headers = {"Content-Type":"application/json"};
    // Maybe need to set max retry in this post request.
    var resp = await Zotero.HTTP.request("POST", url, 
        {
            body: JSON.stringify(postData),
            headers: headers
        });
    try {
        var updateJson = JSON.parse(resp.responseText);
        refreshTime(updateJson);
    } catch (e) {
        alert("获取更新信息失败，请稍后重试");
    }
};

refreshTime = function (updateJson) {
    for (let key in updateJson) {
        let cell = document.getElementById(key + "3");
        if (cell) {
            cell.setAttribute("label", updateJson.key.lastUpdated);
        }
    }
};

downloadTo = async function (label) {
    let cacheFile = Zotero.getTempDirectory();
    var filename = label + ".js";
    cacheFile.append(filename);
    if (cacheFile.exists()) {
        cacheFile.remove(false);
    }
    var url = `https://gitee.com/l0o0/translators_CN/raw/master/translators/${label}.js`;
    try {
        var resp = await Zotero.HTTP.request("GET", url);
        let encoder = new TextEncoder();
        let array = encoder.encode(resp.responseText);
        await OS.File.writeAtomic(cacheFile.path, array, {
            tmpPath: cacheFile.path + ".tmp",
        });
        return cacheFile;
    } catch (e) {
        alert(`${label}.js 下载失败,请稍后尝试重新下载\n` + e);
        return false;
    }
};

moveTo = async function (cacheFile) {
    var desPath = OS.Path.join(
        Zotero.Prefs.get("dataDir"),
        "translators",
        OS.Path.basename(cacheFile.path)
    );
    try {
        await OS.File.move(cacheFile.path, desPath);
        return true;
    } catch (e) {
        alert("文件复制失败\n" + e);
        return false;
    }
};

updateIcon = function (label, status) {
    var button = document.getElementById(label + "5button");
    if (status) {
        button.setAttribute("image", "chrome://jasminum/skin/accept.png");
        var now = new Date();
        now = now.toISOString("yyyy-MM-dd").slice(0, 19).replace("T", " ");
        var current = document.getElementById(label + "2");
        current.setAttribute("label", now);
    } else {
        button.setAttribute("image", "chrome://jasminum/skin/information.png");
    }
};

updateTranslator = async function (label) {
    var downloadFile = await downloadTo(label);
    if (downloadFile) {
        var moveStatus = await moveTo(downloadFile);
        Zotero.debug("------------" + moveStatus);
        updateIcon(label, moveStatus);
    }
};

updateAll = async function() {
    labelCN.forEach(label => await updateTranslator(label));
};
