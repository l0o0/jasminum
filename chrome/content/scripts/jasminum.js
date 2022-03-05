Zotero.Jasminum = new function () {
    // Default values
    this.userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
    this.CNDB = ['CNKI'];
    this.CookieSandbox = null;
    this.RefCookieSandbox = null;

    /**
     * Initiate addon
     */
    this.init = async function () {
        // Register the callback in Zotero as an item observer
        var notifierID = Zotero.Notifier.registerObserver(
            this.notifierCallback,
            ["item"]
        );
        // Unregister callback when the window closes (important to avoid a memory leak)
        window.addEventListener(
            "unload",
            function (e) {
                Zotero.Notifier.unregisterObserver(notifierID);
            },
            false
        );
        // 等待数据维护更新完毕
        // await Zotero.Schema.schemaUpdatePromise;

        this.initPref();
        Components.utils.import("resource://gre/modules/osfile.jsm");
        Zotero.debug("Init Jasminum ...");
    };

    /**
     * Initiate Jasminum preferences
     */
    this.initPref = function () {
        if (Zotero.Prefs.get("jasminum.pdftkpath") === undefined) {
            var pdftkpath = "C:\\Program Files (x86)\\PDFtk Server\\bin";
            if (Zotero.isLinux) {
                pdftkpath = "/usr/bin";
            } else if (Zotero.isMac) {
                pdftkpath = "/opt/pdflabs/pdftk/bin";
            }
            Zotero.Prefs.set("jasminum.pdftkpath", pdftkpath);
        }
        if (Zotero.Prefs.get("jasminum.autoupdate") === undefined) {
            Zotero.Prefs.set("jasminum.autoupdate", false);
        }
        if (Zotero.Prefs.get("jasminum.namepatent") === undefined) {
            Zotero.Prefs.set("jasminum.namepatent", "{%t}_{%g}");
        }
        if (Zotero.Prefs.get("jasminum.zhnamesplit") === undefined) {
            Zotero.Prefs.set("jasminum.zhnamesplit", true);
        }
        if (Zotero.Prefs.get("jasminum.rename") === undefined) {
            Zotero.Prefs.set("jasminum.rename", true);
        }
        if (Zotero.Prefs.get("jasminum.autobookmark") === undefined) {
            Zotero.Prefs.set("jasminum.autobookmark", true);
        }
        if (Zotero.Prefs.get("jasminum.autolanguage") === undefined) {
            Zotero.Prefs.set("jasminum.autolanguage", false);
        }
        if (Zotero.Prefs.get("jasminum.language") === undefined) {
            Zotero.Prefs.set("jasminum.language", 'zh-CN');
        }
    };

    this.notifierCallback = {
        // Check new added item, and adds meta data.
        notify: async function (event, type, ids, extraData) {
            // var automatic_pdf_download_bool = Zotero.Prefs.get('zoteroscihub.automatic_pdf_download');
            if (event == "add") {
                // Auto update meta data
                var addedItems = Zotero.Items.get(ids);
                if (Zotero.Prefs.get("jasminum.autoupdate")) {
                    Zotero.debug("** Jasminum new items added.");
                    var items = [];
                    for (let item of addedItems) {
                        if (Zotero.Jasminum.UI.isCNKIFile(item)) {
                            items.push(item);
                        }
                    }
                    Zotero.debug(`** Jasminum add ${items.length} items`);
                    Zotero.Jasminum.searchItems(items);
                }
                // Split or merge name
                if (!Zotero.Prefs.get("jasminum.zhnamesplit")) {
                    Zotero.debug("** Jasminum merge CN name");
                    var items = [];
                    for (let item of addedItems) {
                        if (
                            Zotero.Jasminum.CNDB.includes(
                                item.getField("libraryCatalog")
                            )
                        ) {
                            items.push(item);
                        }
                    }
                    Zotero.Jasminum.mergeName(items);
                }
                // Add bookmark after new PDF is attached.
                if (Zotero.Prefs.get("jasminum.autobookmark")) {
                    for (let item of addedItems) {
                        if (
                            item.parentID &&
                            Zotero.ItemTypes.getName(
                                item.parentItem.itemTypeID
                            ) == "thesis" &&
                            item.parentItem.getField("libraryCatalog") ==
                            "CNKI" &&
                            item.attachmentContentType == "application/pdf"
                        ) {
                            Zotero.debug("***** New PDF item is added");
                            await Zotero.Jasminum.addBookmarkItem(item);
                        }
                    }
                }
                // Set default language field
                if (Zotero.Prefs.get("jasminum.autolanguage")) {
                    for (let item of addedItems) {
                        if (
                            item.getField("language").match(/中文|cn|zh/)
                        ) {
                            Zotero.debug("***** Set default language");
                            await Zotero.Jasminum.setLanguage(item);
                        }
                    }
                }
            }
        },
    };


    /**
     * For selected CNKI attachments. Retrive keywords from file name.
     * And Search CNKI meta-data by these keywords
     * @return {volid}
     */
    this.searchSelectedItems = function () {
        Zotero.debug("**Jasminum Updating Selected items");
        this.searchItems(ZoteroPane.getSelectedItems());
    };


    this.searchItems = async function (items) {
        if (items.length == 0) return;
        var item = items.shift();
        var itemCollections = item.getCollections();
        Zotero.debug(itemCollections);
        var libraryID = item.libraryID;
        // Retrive meta data for webpage item
        if (Zotero.ItemTypes.getName(item.itemTypeID) === "webpage") {
            Zotero.debug("** Jasminum add webpage.");
            let articleId = this.Scrape.getIDFromUrl(item.getField("url"));
            Zotero.debug([articleId]);
            let postData = this.Scrape.createRefPostData([articleId]);
            let data = await this.Scrape.getRefText(postData);
            // Zotero.debug("** Jasminum webpage data");

            // Some item will be updated after published
            if (data.length === 0 && articleId.dbname.includes("TEMP")) {
                articleId = await this.Scrape.getIDFromPage(item.getField("url"));
                Zotero.debug([articleId]);
            }
            postData = this.Scrape.createRefPostData([articleId]);
            data = await this.Scrape.getRefText(postData);
            var newItems = await this.Utils.trans2Items(data, libraryID);
            let targetData = {
                targetUrls: [item.getField("url")],
                citations: [null]
            };
            newItems = await this.Utils.fixItem(newItems, targetData);
            // Keep the same collection in newItem.
            if (itemCollections.length) {
                for (let collectionID of itemCollections) {
                    for (let i of newItems) {
                        i.addToCollection(collectionID);
                        await i.saveTx();
                    };
                }
            }
            // Move notes and attachments to newItems
            let childIDs = item.getNotes().concat(item.getAttachments());
            if (childIDs.length > 0) {
                for (let childID of childIDs) {
                    var childItem = Zotero.Items.get(childID);
                    childItem.parentID = newItems[0].id;
                    await childItem.saveTx();
                }
            }

            // Move item to Trash
            item.deleted = true;
            await item.saveTx();

        } else {
            var fileData = this.Scrape.splitFilename(item.getFilename());
            Zotero.debug(fileData);
            var targetRows = await this.Scrape.search(fileData);
            // 有查询结果返回
            if (targetRows && targetRows.length > 0) {
                var [data, targetData] = await this.Scrape.getRefworks(
                    targetRows
                );
                var newItems = await this.Utils.trans2Items(data, libraryID);
                Zotero.debug(newItems);
                newItems = await this.Utils.fixItem(newItems, targetData);
                Zotero.debug("** Jasminum DB trans ...");
                if (itemCollections.length) {
                    for (let collectionID of itemCollections) {
                        newItems.forEach(function (item) {
                            item.addToCollection(collectionID);
                        });
                    }
                }
                // 只有单个返回结果
                if (newItems.length == 1) {
                    var newItem = newItems[0];
                    // Put old item as a child of the new item
                    item.parentID = newItem.id;
                    // Use Zotfile to rename file
                    if (
                        Zotero.Prefs.get("jasminum.rename") &&
                        typeof Zotero.ZotFile != "undefined"
                    ) {
                        Zotero.ZotFile.renameSelectedAttachments();
                    }

                    await item.saveTx();
                    await newItem.saveTx();
                    // Add bookmark after PDF attaching to new item
                    if (
                        Zotero.Prefs.get("jasminum.autobookmark") &&
                        this.UI.isCNKIPDF(item)
                    ) {
                        await this.addBookmarkItem(item);
                    }
                } else {
                    // 有多个返回结果，将文件与新条目关联，用于用户后续手动选择
                    newItems.forEach(function (newItem) {
                        item.addRelatedItem(newItem);
                    });
                    await item.saveTx();
                }

                Zotero.debug("** Jasminum finished.");
            } else {
                // 没有查询结果
                this.Utils.showPopup(
                    "No results found!",
                    `作者：${fileData.author},\n   篇名：${fileData.keyword},\n   未查询到结果`,
                    1)
            }
        }
        if (items.length) {
            this.searchItems(items);
        }
    };



    this.addBookmarkItem = async function (item) {
        if (item === undefined) {
            item = ZoteroPane.getSelectedItems()[0];
        }
        if (!(await this.Scrape.checkPath())) {
            this.Utils.showPopup(
                "PDFtk Server is not installed",
                "未找到 PDFtk Server 的可执行文件。参考插件设置首选项中的下载地址下载并安装，在首选项中设置对应的可执行文件路径(路径以bin结尾)",
                1
            );
            return;
        }
        // Show alert when file is missing
        var attachmentExists = await OS.File.exists(item.getFilePath());
        if (!attachmentExists) {
            this.Utils.showPopup(
                "Attachment is missing",
                "该条目下未找到对应的 PDF 文件",
                1
            )
            return;
        }
        var bookmark, note;
        [bookmark, note] = await this.Scrape.getBookmark(item);
        if (!bookmark) {
            this.Utils.showPopup(
                "No Bookmarks found!",
                "未找到书签信息，请打开该条目知网链接，确认网页左侧是否出现书签章节信息",
                1
            )
            return;
        } else {
            // Add TOC note
            var noteHTML = item.getNote();
            noteHTML += note;
            item.setNote(noteHTML);
            await item.saveTx();
            await this.Scrape.addBookmark(item, bookmark);
        }
    };


    this.splitNameM = function () {
        var items = ZoteroPane.getSelectedItems();
        this.splitName(items);
    };

    this.mergeNameM = function () {
        var items = ZoteroPane.getSelectedItems();
        this.mergeName(items);
    };

    this.splitName = async function (items) {
        for (let item of items) {
            var creators = item.getCreators();
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                if ( // English Name
                    (creator.lastName.search(/[A-Za-z]/) >= 0 ||
                        creator.firstName.search(/[A-Za-z]/) >= 0) &&
                    creator.firstName === ""  // 名为空
                ) {
                    var EnglishName = creator.lastName;
                    var temp = EnglishName.split(/[\n\s+,]/g)
                        .filter(Boolean); // 过滤空字段
                    creator.lastName = temp.pop();
                    creator.firstName = temp.join(" ");
                } else if (creator.firstName === "") { // For Chinese Name,名为空
                    var chineseName = creator.lastName || creator.firstName;
                    creator.lastName = chineseName.charAt(0);
                    creator.firstName = chineseName.substr(1);
                }
                creator.fieldMode = 0;// 0: two-field, 1: one-field (with empty first name)
                creators[i] = creator;
            }
            if (creators != item.getCreators()) {
                item.setCreators(creators);
                item.saveTx();
            }
        }
    };

    this.mergeName = async function (items) {
        for (let item of items) {
            var creators = item.getCreators();
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                if ( // English Name
                    creator.lastName.search(/[A-Za-z]/) !== -1 ||
                    creator.lastName.search(/[A-Za-z]/) !== -1
                ) {
                    creator.lastName = creator.firstName + " " + creator.lastName;
                } else { // For Chinese Name
                    creator.lastName = creator.lastName + creator.firstName;
                }
                creator.firstName = "";
                creator.fieldMode = 1;// 0: two-field, 1: one-field (with empty first name)
                creators[i] = creator;
            }
            if (creators != item.getCreators()) {
                item.setCreators(creators);
                item.saveTx();
            }
        }
    };

    this.removeDotM = function () {
        var items = ZoteroPane.getSelectedItems();
        this.removeDot(items);
    };

    this.removeDot = async function (items) {
        for (let item of items) {
            var attachmentIDs = item.getAttachments();
            for (let id of attachmentIDs) {
                var atta = Zotero.Items.get(id);
                var newName = atta.attachmentFilename.replace(
                    /([_\u4e00-\u9fa5]), ([_\u4e00-\u9fa5])/g,
                    "$1$2"
                );
                await atta.renameAttachmentFile(newName);
                atta.setField("title", newName);
                atta.saveTx();
            }
        }
    };

    /**
     * Update citation in Zotero item field
     * 110 citations(CNKI)[2021-08-22]<北大核心, CSCI>
     * @param {[Zotero.item]}
     * @return {volid}
     */
    this.updateCiteCSSCI = async function (items) {
        for (let item of items) {
            if (["patent", "webpage"].includes(Zotero.ItemTypes.getName(item.itemTypeID))) {
                this.Utils.showPopup(
                    "条目类型不支持",
                    `${Zotero.ItemTypes.getName(item.itemTypeID)}类型条目不需要抓取`,
                    1
                )
            } else if (item.getField("title").search(/[_\u4e00-\u9fa5]/) === -1) {
                this.Utils.showPopup(
                    "条目类型不支持",
                    `非中文条目`,
                    1
                )
            } else if (item.getField("url")) {
                let url = item.getField("url");
                let resp = await Zotero.HTTP.request("GET", url);
                let html = this.Utils.string2HTML(resp.responseText);
                // 检测是否出现知网验证页面,一般网页以nxgp开头的页面，会出现知网验证页面
                if (html.querySelector("div.verify_wrap")) {
                    this.Utils.showPopup(
                        "期刊、引用抓取异常",
                        "抓取信息时出现知网验证页面",
                        1);
                    continue;
                }
                let dateString = new Date().toLocaleDateString().replace(/\//g, '-');
                let cite = this.Scrape.getCitationFromPage(html);
                // let citeString = `CNKI citations: ${cite}[${dateString}]`;
                let citeString = `${cite}[${dateString}]`;
                let cssci = this.Scrape.getCSSCI(html);
                // let cssciString = "Chinese Core Journals: <" + cssci + ">";
                let cssciString = "<" + cssci + ">";
                var extraData = item.getField("extra");
                // Remove old cite and CSSCI string
                extraData = extraData.replace(/\d+ citations?\(CNKI\)\[[\d-]{8,10}\].*\s?/, '');
                extraData = extraData.replace(/^<.*?>\s?/, "");
                extraData = extraData.replace(/Chinese Core Journals: <.*?>/, "")
                extraData = extraData.replace(/CNKI citations:\s?\d+\[[\d-]{8,10}\]/, '');
                let extraAdd = "";
                if (cite != null && cite > 0) {
                    // if (extraData.match(/CNKI citations:\s?/)) {
                    //     extraData = extraData.replace(/CNKI citations:\s?\d+\[[\d-]{10}\]/,
                    //         citeString);
                    // } else {
                    //     extraData = extraData.trim() + '\n' + citeString;
                    // }  // 暂时注释，等后期使用新的展示方式
                    if (extraData.match(/👍/)) {  // 先用这简单的展示，便于展示排序
                        extraData = extraData.replace(/👍\s?\d+\[[\d-]{8,10}\]/, "");
                    }
                    extraAdd = "👍" + citeString;
                }

                if (cssci) {  // 或者可以参考其他核心期刊数据来源
                    // if (extraData.match(/Chinese Core Journals: /)) {
                    //     extraData = extraData.replace(/Chinese Core Journals: <.*?>/, cssciString);
                    // } else {
                    //     extraData = extraData.trim() + '\n' + cssciString;
                    // }
                    if (extraData.match(/📗/)) {
                        extraData = extraData.replace(/📗<.*?>/, "");
                    }
                    extraAdd += '📗' + cssciString;
                }
                this.Utils.showPopup(
                    "期刊、引用抓取完毕",
                    `${item.getField('title')}, ${cite}, ${cssci ? cssci : '非核心期刊'}`,
                    0
                )
                Zotero.debug("** Jasminum cite number: " + cite);
                Zotero.debug("** Jasminum cssci: " + cssci);
                item.setField("extra", extraAdd + "\n" + extraData.trim());
                await item.saveTx();
            } else {
                this.Utils.showPopup(
                    "条目抓取失败",
                    "缺失条目 URL 信息",
                    1
                );
            }
        }
    };

    this.updateCiteCSSCIItems = function () {
        var items = ZoteroPane.getSelectedItems();
        this.updateCiteCSSCI(items);
    };

    /**
     * Set default language value in item field
     * @param {[Zotero.item]}
     * @return {volid}
     */
    this.setLanguage = async function (item) {
        let defaultLanguage = Zotero.Prefs.get("jasminum.language");
        if (item.getField("language") != defaultLanguage) {
            item.setField("language", defaultLanguage);
            await item.saveTx();
        }
    };

    this.setLanguageItems = async function () {
        var items = ZoteroPane.getSelectedItems();
        for (var item of items) { await this.setLanguage(item) }
    };
}