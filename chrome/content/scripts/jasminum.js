Zotero.Jasminum = new function () {
    // Default values
    this.userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
    this.CNDB = ['CNKI', 'WeiPu', 'Wanfang Data', 'SuperLib', '中国知网CNKI', '维普', '万方', '全国图书馆联盟'];
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
        const initPrefs = {
            "jasminum.autoupdate": false,
            "jasminum.namepatent": "{%t}_{%g}",
            "jasminum.zhnamesplit": false,
            "jasminum.rename": true,
            "jasminum.autobookmark": true,
            "jasminum.autolanguage": false,
            "jasminum.autolanguagefunc": 'Auto',
            "jasminum.language": 'zh_CN',
            "jasminum.languagelist": 'zh,en',
            "jasminum.ennamesplit": true,
            "jasminum.attachment": 'pdf',
            "jasminum.citefield": 'extra',
            "jasminum.dateformatter": 'ISO',
            "jasminum.dateformatterfill": false,
            "jasminum.translatorurl": "https://oss.wwang.de/translators_CN"
        };

        for (let pref in initPrefs) {
            if (Zotero.Prefs.get(pref) === undefined) Zotero.Prefs.set(pref, initPrefs[pref]);
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
                        switch (Zotero.Prefs.get("jasminum.autolanguagefunc")) {
                            case "Auto":
                                await Zotero.Jasminum.bacthSetLanguage(item);
                                break;
                            case "Manual":
                                await Zotero.Jasminum.setLanguage(item);
                                break;
                        }
                    }
                }
            }
        },
    };


    /**
     * For selected CNKI attachments. Retrive keywords from file name.
     * And Search CNKI meta-data by these keywords
     * @return {void}
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
            let articleId = this.Scrape.getIDFromURL(item.getField("url"));
            Zotero.debug([articleId]);
            let data = await this.Scrape.getRefText([articleId]);
            // Zotero.debug("** Jasminum webpage data");

            // Some item will be updated after published
            if (data.length === 0 && articleId.dbname.includes("TEMP")) {
                articleId = await this.Scrape.getIDFromPage(item.getField("url"));
                Zotero.debug([articleId]);
            }
            data = await this.Scrape.getRefText([articleId]);
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
            var fileData = this.Scrape.splitFilename(item.attachmentFilename);
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


    this.splitNameM = function (type) {
        var items = this.getItems(type, true);
        this.splitName(items);
    };

    this.mergeNameM = function (type) {
        var items = this.getItems(type, true);
        this.mergeName(items);
    };

    this.splitName = async function (items) {
        var isSplitEnName = Zotero.Prefs.get("jasminum.ennamesplit")
        for (let item of items) {
            var creators = item.getCreators();
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                creator.fieldMode = 0;
                if ( // English Name
                    (creator.lastName.search(/[A-Za-z]/) >= 0 ||
                        creator.firstName.search(/[A-Za-z]/) >= 0) &&
                    creator.firstName === ""  // 名为空
                ) {
                    // 如果不拆分/合并英文名，则跳过
                    if (!isSplitEnName) continue
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
        var isSplitEnName = Zotero.Prefs.get("jasminum.ennamesplit")
        for (let item of items) {
            var creators = item.getCreators();
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                creator.fieldMode = 1;
                if ( // English Name
                    creator.lastName.search(/[A-Za-z]/) !== -1 ||
                    creator.lastName.search(/[A-Za-z]/) !== -1
                ) {
                    // 如果不拆分/合并英文名，则跳过
                    if (!isSplitEnName) continue
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

    this.splitSemicolonNamesN = async function (type) {
        var items = this.getItems(type, true)
        this.splitSemicolonNames(items);
    }

    /**
     * 在知网搜索结果列表添加文献时，可能导致该文献的作者名变成类似于 姓名;姓名;姓名 的形式，
     * 使用此函数将分号分隔的姓名分隔到不同的条目中。
     */
    this.splitSemicolonNames = async function (items) {
        for (let item of items) {
            const creators = item.getCreators();
            var newlist = [];
            for (let creator of creators) {
                if (
                    creator.lastName.search(";") &&
                    creator.firstName === ""
                ) {
                    const names = creator.lastName.split(";").filter(s => s !== "");
                    for (let name of names) {
                        newlist.push(
                            {
                                "firstName": "",
                                "lastName": name,
                                "creatorType": "author"
                            }
                        );
                    }
                } else {
                    newlist.push(creator);
                }
            }
            if (newlist !== creators) {
                item.setCreators(newlist);
                item.saveTx();
            }
        }
    }

    this.removeDotM = function (type) {
        var items = this.getItems(type, true);
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
     * @return {void}
     */
    this.updateCiteCSSCI = async function (items) {
        var html;
        for (let item of items) {
            if (["patent", "webpage"].includes(Zotero.ItemTypes.getName(item.itemTypeID))) {
                this.Utils.showPopup(
                    "条目类型不支持",
                    `${Zotero.ItemTypes.getName(item.itemTypeID)}类型条目不需要抓取`,
                    1
                )
                continue;
            } else if (item.getField("title").search(/[_\u4e00-\u9fa5]/) === -1) {
                this.Utils.showPopup(
                    "条目类型不支持",
                    `非中文条目`,
                    1
                )
                continue;
            } else if (item.getField("url")) {
                let url = item.getField("url");
                let resp = await Zotero.HTTP.request("GET", url);
                html = this.Utils.string2HTML(resp.responseText);
                // 检测是否出现知网验证页面,一般网页以nxgp开头的页面，会出现知网验证页面
                if (html.querySelector("div.verify_wrap")) {
                    this.Utils.showPopup(
                        "期刊、引用抓取异常",
                        "抓取信息时出现知网验证页面",
                        1);
                    continue;
                }
                // 特异性网址，
                if (Zotero.Utilities.xpath(html, "//h2[@id='erro_span']")) {
                    Zotero.debug("** Jasminum 条目网址有点特殊");
                    let fileData = {
                        keyword: item.getField("title"),
                        author: item.getCreators()[0].lastName + item.getCreators()[0].firstName
                    };
                    let targetRows = await this.Scrape.search(fileData);
                    if (targetRows && targetRows.length > 0) {
                        let urls = await this.Scrape.getRefworks(
                            targetRows, onlyUrl = true
                        );
                        Zotero.debug("** Jasminum " + urls[0]);
                        item.setField('url', urls[0]);
                        item.saveTx();
                        url = item.getField("url");
                        resp = await Zotero.HTTP.request("GET", url);
                        html = this.Utils.string2HTML(resp.responseText);
                        // 检测是否出现知网验证页面,一般网页以nxgp开头的页面，会出现知网验证页面
                        if (html.querySelector("div.verify_wrap")) {
                            this.Utils.showPopup(
                                "期刊、引用抓取异常",
                                "抓取信息时出现知网验证页面",
                                1);
                            continue;
                        }
                    }

                }
                let dateString = new Date().toLocaleDateString().replace(/\//g, '-');
                let cite = this.Scrape.getCitationFromPage(html);
                // let citeString = `CNKI citations: ${cite}[${dateString}]`;
                let citeString = `${cite}[${dateString}]`;
                let cssci = this.Scrape.getCSSCI(html);
                // let cssciString = "Chinese Core Journals: <" + cssci + ">";
                let cssciString = "<" + cssci + ">";
                let field = Zotero.Prefs.get("jasminum.citefield");
                var extraData = item.getField(field);
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
                item.setField(field, extraAdd + "\n" + extraData.trim());
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
     * @return {void}
     */
    this.setLanguage = async function (item) {
        let defaultLanguage = Zotero.Prefs.get("jasminum.language");
        if (item.getField("language") != defaultLanguage) {
            item.setField("language", defaultLanguage);
            await item.saveTx();
        }
    };

    this.setLanguageItems = async function (type) {
        var items = this.getItems(type, true);
        for (let item of items) { await this.setLanguage(item) }
    };

    /**
     * Batch Set language using nlp.js
     * @param {[Zotero.item]}
     * @return {void}
     */
    this.bacthSetLanguage = async function (item) {
        // 获取常用语言列表
        let languageStr = Zotero.Prefs.get("jasminum.languagelist").replace(/\s*/g, "");
        let languageList = languageStr.split(/,|，/g);
        // 使用 nlp.js 进行识别
        let langGuess = this.NLP.guess(item.getField("title"), languageList)[0]["alpha2"];
        if (langGuess && item.getField("language") != langGuess) {
            item.setField("language", langGuess);
            await item.saveTx();
        }
    };

    this.bacthSetLanguageItems = async function (type) {
        let items = this.getItems(type, true);
        for (let item of items) { await this.bacthSetLanguage(item) }
    };



    /**
     * Uniform date format
     * Inspired by https://forums.zotero.org/discussion/84444/date-formats
     * date format https://www.w3schools.com/js/js_date_formats.asp
     * @param {[Zotero.item]}
     * @return {void}
     */
    this.dateFormatter = async function (type) {
        let items = this.getItems(type, true)
        let dateFormat = Zotero.Prefs.get("jasminum.dateformatter")
        let isFill = Zotero.Prefs.get("jasminum.dateformatterfill")
        let separator = (dateFormat == "ISO") ? "-" : "/"
        for (let item of items) {
            let oldDate = item.getField('date')
            let dateJSON = Zotero.Date.strToDate(oldDate);
            let newDate = ""
            if (dateFormat == "yearOnly") {
                newDate = dateJSON.year
            } else {
                // month 以 0 开始
                let newMonth = dateJSON.month + 1
                let newDay = dateJSON.day
                if (isFill) {
                    // 当 month，day 小于 10 时，在前补 0 
                    newMonth = ('0' + newMonth).slice(-2)
                    newDay = ('0' + dateJSON.day).slice(-2)
                }
                let dateList = [dateJSON.year, newMonth, newDay]
                if (dateFormat == "short") dateList.reverse()
                // 去除日期数组里 undefined, NaN
                newDate = dateList.filter(x => Number(x)).join(separator)
            }
            if (newDate && newDate != oldDate) {
                item.setField("date", newDate)
                await item.saveTx();
            }
        }
    }

    /**
     * get items from different type
     * @param {string}
     * @return {[Zotero.item]}
     */
    this.getItems = function (type = "items", regular = false) {
        let items = []
        if (type === "items") {
            items = ZoteroPane.getSelectedItems()
        } else if (type === "collection") {
            let collection = ZoteroPane.getSelectedCollection();
            if (collection) items = collection.getChildItems();
        }
        // 只保留元数据条目
        // 用于解决多选项目时选中附件类条目导致小组件修改错误，使得批量修改中断。
        if (regular) items = items.filter(item => item.isRegularItem())
        return items
    }

    /**
     * Download pdf/caj attachments from CNKI for selected items
     * @param {[Zotero.item]}
     * @return {void}
     */
    this.getAttachments = async function () {
        var items = ZoteroPane.getSelectedItems();
        for (var item of items) { await this.Scrape.importAttachment(item) }
    };
}
