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

initTranslatorPanel = async function () {
    var web = new Zotero.Translate.Web();
    var translators = await web._translatorProvider.getAllForType("web");
    var translators = translators.sort((a, b) =>
        a.label.localeCompare(b.label)
    );
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
    var translatorsCN = translators.filter((t) => t.label in labelCN);
    var listitem, listcell, button;
    var listbox = document.getElementById("translators-listbox");
    for (let translator of translatorsCN) {
        listitem = document.createElement("listitem");
        listitem.setAttribute("allowevents", "true");
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", labelCN[translator.label]);
        listcell.setAttribute("id", translator.label + "1");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", translator.lastUpdated);
        listcell.setAttribute("id", translator.label + "2");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("label", translator.fileName);
        listcell.setAttribute("id", translator.label + "3");
        listitem.appendChild(listcell);
        listcell = document.createElement("listcell");
        listcell.setAttribute("id", translator.label + "4");
        button = document.createElement("button");
        button.setAttribute("oncommand", "alert('update');");
        button.setAttribute("image", "chrome://jasminum/skin/accept.png");
        listcell.appendChild(button);
        listitem.appendChild(listcell);

        listbox.appendChild(listitem);
    }
};
