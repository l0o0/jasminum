Zotero.Jasminum.UI = new function () {
    /**
     * Show item menu according item type
     * @return {void}
     */
    this.displayMenuitem = function () {
        var pane = Services.wm.getMostRecentWindow("navigator:browser")
            .ZoteroPane;
        var items = pane.getSelectedItems();
        Zotero.debug("**Jasminum selected item length: " + items.length);
        var showMenu = items.some((item) => this.UI.isCNKIFile(item));
        pane.document.getElementById(
            "zotero-itemmenu-jasminum"
        ).hidden = !showMenu;
        var showMenuName = items.some((item) =>
            this.UI.isCNKIName(item)
        );
        pane.document.getElementById(
            "zotero-itemmenu-jasminum-namehandler"
        ).hidden = !showMenuName;
        var showMenuPDF = false;
        if (items.length === 1) {
            showMenuPDF = this.UI.isCNKIPDF(items[0]);
            Zotero.debug("** Jasminum show menu PDF: " + showMenuPDF);
            pane.document.getElementById(
                "zotero-itemmenu-jasminum-bookmark"
            ).hidden = !showMenuPDF;
        }
        pane.document.getElementById("id-jasminum-separator").hidden = !(
            showMenu ||
            showMenuPDF ||
            showMenuName
        );
        Zotero.debug(
            "**Jasminum show menu: " + showMenu + showMenuName + showMenuPDF
        );
    }.bind(Zotero.Jasminum);

    /**
     * Return true when item is a single CNKI file
     * Filename contains Chinese characters and ends with pdf/caj
     * @param {Zotero.item}
     * @return {bool}
     */
    this.isCNKIFile = function (item) {
        // Return true, when item is OK for update cnki data.
        if (
            !item.isAttachment() ||
            item.isRegularItem() ||
            !item.isTopLevelItem()
        ) {
            return false;
        }

        var filename = item.getFilename();
        // Find Chinese characters in string
        if (escape(filename).indexOf("%u") < 0) return false;
        // Extension should be CAJ or PDF
        var ext = filename.substr(filename.length - 3, 3);
        if (ext != "pdf" && ext != "caj") return false;
        return true;
    }.bind(Zotero.Jasminum);

    /**
     * Return true when item is top level item.
     * @param {Zotero.item}
     * @return {bool}
     */
    this.isCNKIName = function (item) {
        return item.isRegularItem() && item.isTopLevelItem();
    }.bind(Zotero.Jasminum);

    /**
     * Return true when item is a CNKI PDF attachment.
     * @param {Zotero.item}
     * @return {bool}
     */
    this.isCNKIPDF = function (item) {
        return (
            !item.isTopLevelItem() &&
            item.isAttachment() &&
            item.attachmentContentType &&
            item.attachmentContentType === "application/pdf" &&
            item.parentItem.getField("libraryCatalog") &&
            item.parentItem.getField("libraryCatalog").includes("CNKI") &&
            Zotero.ItemTypes.getName(item.parentItem.itemTypeID) === "thesis"
        );
    }.bind(Zotero.Jasminum);
}