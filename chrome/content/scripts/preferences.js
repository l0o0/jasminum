import FilePicker from 'zotero/filePicker';

initPref= function() {
    var jasminum_autoupdate = Zotero.Prefs.get("zotero.jasminum.autoupdate");
    var jasminum_pdftk_path = Zotero.Prefs.get("zotero.jasminum.pdftkpath");
    document.getElementById(
        "jasminum-autoupdate"
    ).checked = jasminum_autoupdate;
    document.getElementById("jasminum-pdftk-path").value = jasminum_pdftk_path;
}

choosePath= function() {
    var fp = new FilePicker();
    fp.init(window, "选择pdftk/pdftk.exe所在目录", fp.modeGetFolder);
    fp.appendFilters(fp.filterAll);
	if (await fp.show() != fp.returnOK) {
		return false;
	}
    Zotero.Prefs.set("zotero.jasminum.pdftkpath", fp.file);
    }

checkPath= async function() {
    var pdftkpath = Zotero.Prefs.get("zotero.jasminum.pdftkpath");
    var pdftk = "";
    if (Zotero.isWin) {
        pdftk = OS.Path.join(pdftkpath, 'pdftk.exe');
    } else {
        pdftk = OS.Path.join(pdftkpath, 'pdftk');
    }
    var fileExist = await OS.File.exists(pdftk);
    document.getElementById("path-accept").hidden = !fileExist;
    document.getElementById("path-error").hidden = fileExist;
}