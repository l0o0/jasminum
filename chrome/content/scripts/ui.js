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
        // Menu for get CNKI metadata
        var showSearch = items.some((item) => this.UI.isCNKIFile(item) || this.UI.isCNKIWeb(item));
        pane.document.getElementById("jasminum-itemmenu-search").hidden = !showSearch;

        // Menu for Chinese name
        var showName = items.some((item) =>
            this.UI.isCNKIName(item)
        );
        // Keep toolbox always visible
        // pane.document.getElementById(
        //     "jasminum-popup-menu2"
        // ).hidden = !showName; // 小工具弹出菜单
        pane.document.getElementById("jasminum-itemmenu-updateCiteCSSCI").hidden = !showName;
        pane.document.getElementById("jasminum-itemmenu-attachment").hidden = !showName;
        // Menu for PDF bookmark
        var showBookmark = false;
        if (items.length === 1) {
            showBookmark = this.UI.isCNKIPDF(items[0]);
            pane.document.getElementById(
                "jasminum-itemmenu-bookmark"
            ).hidden = !showBookmark;
        }

        let isDisplayMenu = showSearch || showName || showBookmark;
        // pane.document.getElementById("jasminum-separator").hidden = !isDisplayMenu;
        pane.document.getElementById("jasminum-popup-menu1").hidden = !isDisplayMenu;

        Zotero.debug(
            `**Jasminum show menu: search ${showSearch} name ${showName} boomark ${showBookmark}`
        );
    }.bind(Zotero.Jasminum);

    /**
     * Show item menu according item type (Collection)
     * @return {void}
     */
    this.displayCollectionMenuitem = function () {
        var items = this.getItems("collection")
        var isEmptyItems = (items.length == 0)
        Zotero.debug(isEmptyItems)
        ZoteroPane.document.getElementById("jasminum-popup-collection").hidden = isEmptyItems
        ZoteroPane.document.getElementById("jasminum-separator-collection").hidden = isEmptyItems

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
        // Extension should be CAJ , PDF, kdh, nh
        var ext = filename.match(/\.(\w+)$/, filename)[1];
        if (!['pdf', 'caj', 'kdh', 'nh'].includes(ext)) return;
        return true;
    }.bind(Zotero.Jasminum);

    /**
     * Return true when item is top level item.
     * @param {Zotero.item}
     * @return {bool}
     */
    this.isCNKIName = function (item) {
        return !item.isAttachment() && item.isRegularItem() && item.isTopLevelItem();
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
            Zotero.ItemTypes.getName(item.parentItem.itemTypeID) === "thesis"
        );
    }.bind(Zotero.Jasminum);

    this.isCNKIWeb = function (item) {
        return (
            item.isTopLevelItem() &&
            item.isRegularItem() &&
            Zotero.ItemTypes.getName(item.itemTypeID) === "webpage" &&
            item.getField("title").endsWith("中国知网")
        );
    }.bind(Zotero.Jasminum);
}