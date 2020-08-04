Zotero.Jasminum.Prefs = {
    initPref: async function () {
        Components.utils.import("resource://gre/modules/osfile.jsm");
        var jasminum_autoupdate = Zotero.Prefs.get(
            "zotero.jasminum.autoupdate"
        );
        var jasminum_pdftk_path = Zotero.Prefs.get("zotero.jasminum.pdftkpath");
        document.getElementById(
            "jasminum-autoupdate"
        ).checked = jasminum_autoupdate;
        document.getElementById(
            "jasminum-pdftk-path"
        ).value = jasminum_pdftk_path;
        var fileExist = await this.checkPath();
        this.pathCheckIcon(fileExist);
    },

    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker
    choosePath: async function () {
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
            Zotero.debug("11111111111111111111");
            return false;
        }
        Zotero.debug("** Jasminum " + fp.file.path);
        Zotero.Prefs.set("zotero.jasminum.pdftkpath", fp.file.path);
        document.getElementById("jasminum-pdftk-path").value = fp.file.path;
        var fileExist = await this.checkPath();
        this.pathCheckIcon(fileExist);
    },

    checkPath: async function () {
        Zotero.debug("** Jasminum check path.");
        var pdftkpath = Zotero.Prefs.get("zotero.jasminum.pdftkpath");
        Zotero.debug(pdftkpath);
        var pdftk = "";
        if (Zotero.isWin) {
            Zotero.debug("1");
            pdftk = OS.Path.join(pdftkpath, "pdftk.exe");
        } else {
            Zotero.debug("2");
            pdftk = OS.Path.join(pdftkpath, "pdftk");
        }
        Zotero.debug(pdftk);
        var fileExist = await OS.File.exists(pdftk);
        Zotero.debug(fileExist);
        return fileExist;
    },

    pathCheckIcon: function (fileExist) {
        document.getElementById("path-accept").hidden = !fileExist;
        document.getElementById("path-error").hidden = fileExist;
        Zotero.debug("** Jasminum Icon");
        Zotero.debug("1" + document.getElementById("path-accept").hidden);
        Zotero.debug("2" + document.getElementById("path-error").hidden);
    },
};
