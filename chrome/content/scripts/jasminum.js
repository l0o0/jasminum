Zotero.Jasminum = {
    init: function () {
        // // Register the callback in Zotero as an item observer
        // var notifierID = Zotero.Notifier.registerObserver(
        //   Zotero.Jasminum.notifierCallback,
        //   ["item"]
        // );
        // // Unregister callback when the window closes (important to avoid a memory leak)
        // window.addEventListener(
        //   "unload",
        //   function (e) {
        //     Zotero.Notifier.unregisterObserver(notifierID);
        //   },
        //   false
        // );
        Components.utils.import("resource://gre/modules/osfile.jsm");
        Zotero.debug("Init Jasminum ...");
    },

    notifierCallback: {
        // Check new added item, and adds meta data.
        // TODO Add a check function here
        notify: function (event, type, ids, extraData) {
            // var automatic_pdf_download_bool = Zotero.Prefs.get('zoteroscihub.automatic_pdf_download');
            if (event == "add") {
                suppress_warnings = true;
                Zotero.Jasminum.updateItems(
                    Zotero.Items.get(ids),
                    suppress_warnings
                );
            }
        },
    },

    displayMenuitem: function () {
        var pane = Services.wm.getMostRecentWindow("navigator:browser")
            .ZoteroPane;
        var items = pane.getSelectedItems();
        Zotero.debug("**Jasminum selected item length: " + items.length);
        var showMenu = items.some((item) => Zotero.Jasminum.checkItem(item));
        pane.document.getElementById(
            "zotero-itemmenu-jasminum"
        ).hidden = !showMenu;
        var showMenuPDF = false;
        if (items.length === 1) {
            showMenuPDF = Zotero.Jasminum.checkItemPDF(items[0]);
            pane.document.getElementById(
                "zotero-itemmenu-jasminum-bookmark"
            ).hidden = !showMenuPDF;
        }
        pane.document.getElementById("id-jasminum-separator").hidden = !(
            showMenu || showMenuPDF
        );
        Zotero.debug("**Jasminum show menu: " + (showMenu || showMenuPDF));
    },

    updateSelectedEntity: function (libraryId) {
        Zotero.debug("**Jasminum Updating items in entity");
        if (!ZoteroPane.canEdit()) {
            ZoteroPane.displayCannotEditLibraryMessage();
            return;
        }

        var collection = ZoteroPane.getSelectedCollection(false);

        if (collection) {
            Zotero.debug(
                "**Jasminum Updating items in entity: Is a collection == true"
            );
            var items = [];
            collection.getChildItems(false, false).forEach(function (item) {
                items.push(item);
            });
            suppress_warnings = true;
            Zotero.Jasminum.updateItems(items, suppress_warnings);
        }
    },

    updateSelectedItems: function () {
        Zotero.debug("**Jasminum Updating Selected items");
        Zotero.Jasminum.updateItems(ZoteroPane.getSelectedItems());
    },

    checkItem: function (item) {
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
    },

    splitFilename: function (filename) {
        // Make query parameters from filename
        var prefix = filename.substr(0, filename.length - 4);
        var prefixArr = prefix.split("_");
        return {
            author: prefixArr[prefixArr.length - 1],
            keyword: prefixArr.slice(0, prefixArr.length - 1).join(" "),
        };
    },

    createPost: function (fileData) {
        // Create a search string.
        static_post_data = {
            action: "",
            NaviCode: "*",
            ua: "1.21",
            isinEn: "1",
            PageName: "ASP.brief_result_aspx",
            DbPrefix: "SCDB",
            DbCatalog: "中国学术期刊网络出版总库",
            ConfigFile: "SCDB.xml",
            db_opt: "CJFQ,CDFD,CMFD,CPFD,IPFD,CCND,CCJD",
            year_type: "echar",
            CKB_extension: "ZYW",
            txt_1_sel: "SU$%=|",
            txt_1_value1: fileData.keyword,
            txt_1_relation: "#CNKI_AND",
            txt_1_special1: "=",
            au_1_sel: "AU",
            au_1_sel2: "AF",
            au_1_value1: fileData.author,
            au_1_special1: "=",
            au_1_special2: "%",
            his: "0",
            __: Date() + " (中国标准时间)",
        };
        var urlEncodedDataPairs = [];
        for (name in static_post_data) {
            urlEncodedDataPairs.push(
                encodeURIComponent(name) +
                    "=" +
                    encodeURIComponent(static_post_data[name])
            );
        }
        return urlEncodedDataPairs.join("&").replace(/%20/g, "+");
    },

    selectRow: function (rowSelectors) {
        Zotero.debug("**Jasminum select window start");
        var io = { dataIn: rowSelectors, dataOut: null };
        var newDialog = window.openDialog(
            "chrome://zotero/content/ingester/selectitems.xul",
            "_blank",
            "chrome,modal,centerscreen,resizable=yes",
            io
        );
        return io.dataOut;
    },

    getIDFromUrl: function (url) {
        if (!url) return false;
        // add regex for navi.cnki.net
        var dbname = url.match(/[?&](?:db|table)[nN]ame=([^&#]*)/i);
        var filename = url.match(/[?&]filename=([^&#]*)/i);
        var dbcode = url.match(/[?&]dbcode=([^&#]*)/i);
        if (
            !dbname ||
            !dbname[1] ||
            !filename ||
            !filename[1] ||
            !dbcode ||
            !dbcode[1] ||
            dbname[1].match("TEMP$")
        )
            return false;
        return { dbname: dbname[1], filename: filename[1], dbcode: dbcode[1] };
    },

    parseRef: function (targetID) {
        var postData =
            "formfilenames=" +
            encodeURIComponent(
                targetID.dbname + "!" + targetID.filename + "!1!0,"
            ) +
            "&hid_kLogin_headerUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F" +
            "&hid_KLogin_FooterUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F" +
            "&CookieName=FileNameS";
    },

    promiseGet: function (url) {
        Zotero.debug("** Jasminum create http get.");
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.onload = function () {
                if (Zotero.Jasminum.status === 200) {
                    resolve(xhr.response);
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText,
                    });
                }
            };
            xhr.onerror = function () {
                reject({
                    status: this.status,
                    statusText: xhr.statusText,
                });
            };
            xhr.send();
        });
    },

    searchPrepare: async function (fileData) {
        var searchData = Zotero.Jasminum.createPost(fileData);
        var SEARCH_HANDLE_URL =
            "https://kns.cnki.net/kns/request/SearchHandler.ashx";
        var url = SEARCH_HANDLE_URL + "?" + searchData;
        Zotero.debug("**Jasminum start prepare");
        var searchPrepareOut = await Zotero.Jasminum.promiseGet(url);
        return searchPrepareOut;
    },

    search: async function (searchPrepareOut, fileData) {
        Zotero.debug("**Jasminum start search");
        var keyword = encodeURI(fileData.keyword);
        Zotero.debug("**Jasminum  keyword: " + keyword);
        var resultUrl =
            "https://kns.cnki.net/kns/brief/brief.aspx?pagename=" +
            searchPrepareOut +
            `&t=${Date.parse(new Date())}&keyValue=${keyword}&S=1&sorttype=`;
        Zotero.debug(resultUrl);
        var searchResult = await Zotero.Jasminum.promiseGet(resultUrl);
        var targetRow = Zotero.Jasminum.getSearchItems(xhr.response);
        return targetRow;
    },

    getSearchItems: function (resptext) {
        Zotero.debug("**Jasminum get item from search");
        var parser = new DOMParser();
        var html = parser.parseFromString(resptext, "text/html");
        var rows = html.querySelectorAll("table.GridTableContent > tbody > tr");
        Zotero.debug("**Jasminum 搜索结果：" + (rows.length - 1));
        var targetRow;
        if (rows.length <= 1) {
            Zotero.debug("**Jasminum No items found.");
            return null;
        } else if (rows.length == 2) {
            targetRow = rows[1];
        } else {
            // Get the right item from search result.
            var rowIndicators = {};
            for (let idx = 1; idx < rows.length; idx++) {
                var rowText = rows[idx].textContent.split(/\s+/).join(" ");
                rowIndicators[idx] = rowText;
                Zotero.debug(rowText);
            }
            var targetIndicator = Zotero.Jasminum.selectRow(rowIndicators);
            // Zotero.debug(targetIndicator);
            // No item selected, return null
            if (!targetIndicator) return null;
            targetRow = rows[Object.keys(targetIndicator)[0]];
        }
        // Zotero.debug(targetRow.textContent);
        return targetRow;
    },

    getRefworks: async function (targetRow) {
        Zotero.debug("**Jasminum start get ref");
        if (targetRow == null) {
            return new Error("No items returned from the CNKI");
        }
        Zotero.debug(targetRow);
        var targetUrl = targetRow.getElementsByClassName("fz14")[0].href;
        var targetID = Zotero.Jasminum.getIDFromUrl(targetUrl);
        Zotero.debug(targetID);
        // Get reference data from CNKI by ID.
        var postData =
            "formfilenames=" +
            encodeURIComponent(
                targetID.dbname + "!" + targetID.filename + "!1!0,"
            ) +
            "&hid_kLogin_headerUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F" +
            "&hid_KLogin_FooterUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F" +
            "&CookieName=FileNameS";
        var url =
            "https://kns.cnki.net/kns/ViewPage/viewsave.aspx?displayMode=Refworks&" +
            postData;
        var resp = await Zotero.Jasminum.promiseGet(url);
        // Zotero.debug(resp);
        var parser = new DOMParser();
        var html = parser.parseFromString(resp, "text/html");
        var data = Zotero.Utilities.xpath(
            html,
            "//table[@class='mainTable']//td"
        )[0]
            .innerHTML.replace(/<br>/g, "\n")
            .replace(
                /^RT\s+Conference Proceeding/gim,
                "RT Conference Proceedings"
            )
            .replace(/^RT\s+Dissertation\/Thesis/gim, "RT Dissertation")
            .replace(/^(A[1-4]|U2)\s*([^\r\n]+)/gm, function (m, tag, authors) {
                authors = authors.split(/\s*[;，,]\s*/); // that's a special comma
                if (!authors[authors.length - 1].trim()) authors.pop();
                return tag + " " + authors.join("\n" + tag + " ");
            });
        Zotero.debug(data);
        return data;
    },

    promiseTranslate: async function (translate, libraryID) {
        Zotero.debug("** Jasminum translate begin ...");
        translate.setHandler("select", function (translate, items, callback) {
            for (let i in items) {
                let obj = {};
                obj[i] = items[i];
                callback(obj);
                return;
            }
        });

        let newItems = translate.translate({
            libraryID: libraryID,
            saveAttachments: false,
        });
        if (newItems.length) {
            Zotero.debug(newItems[0]);
            Zotero.debug("** Jasminum translate end.");
            return newItems[0];
        }
        throw new Error("No items found");
    },

    fixItem: function (newItem) {
        var creators = newItem.getCreators();
        for (var i = 0; i < creators.length; i++) {
            var creator = creators[i];
            if (creator.firstName) continue;

            var lastSpace = creator.lastName.lastIndexOf(" ");
            if (
                creator.lastName.search(/[A-Za-z]/) !== -1 &&
                lastSpace !== -1
            ) {
                // western name. split on last space
                creator.firstName = creator.lastName.substr(0, lastSpace);
                creator.lastName = creator.lastName.substr(lastSpace + 1);
            } else {
                // Chinese name. first character is last name, the rest are first name
                creator.firstName = creator.lastName.substr(1);
                creator.lastName = creator.lastName.charAt(0);
            }
            creators[i] = creator;
        }
        newItem.setCreators(creators);
        // Clean up abstract
        if (newItem.getField("abstractNote")) {
            newItem.setField(
                "abstractNote",
                newItem
                    .getField("abstractNote")
                    .replace(/\s*[\r\n]\s*/g, "\n")
                    .replace(/&lt;.*?&gt;/g, "")
            );
        }
        // Remove wront CN field.
        newItem.setField("callNumber", "");
        newItem.setField("libraryCatalog", "CNKI");
        if (newItem.getNotes()) {
            Zotero.Items.erase(newItem.getNotes());
        }
        return newItem;
    },

    updateItems: async function (items) {
        var zp = Zotero.getActiveZoteroPane();
        if (items.length == 0) return;
        var selectParent = true ? items.length === 1 : false;
        var item = items.shift();
        var itemCollections = item.getCollections();
        var libraryID = item.libraryID;
        if (!Zotero.Jasminum.checkItem(item)) return;
        var fileData = Zotero.Jasminum.splitFilename(item.getFilename());
        var searchPrepareOut = await Zotero.Jasminum.searchPrepare(fileData);
        Zotero.debug("searchPrepareOut");
        Zotero.debug(searchPrepareOut);
        var targetRow = Zotero.Jasminum.search(searchPrepareOut, fileData);
        Zotero.debug("targetRow");
        Zotero.debug(targetRow);
        var data = Zotero.Jasminum.getRefworks(targetRow);
        var translate = new Zotero.Translate.Import();
        translate.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86");
        translate.setString(data);
        var newItem = await Zotero.Jasminum.promiseTranslate(
            translate,
            libraryID
        );
        Zotero.debug(newItem);
        newItem = Zotero.Jasminum.fixItem(newItem);
        Zotero.debug("**Jasminum DB trans ...");
        if (itemCollections.length) {
            for (let collectionID of itemCollections) {
                newItem.addToCollection(collectionID);
            }
        }

        // Put old item as a child of the new item
        item.parentID = newItem.id;
        item.saveTx();
        newItem.saveTx();
        if (items.length) {
            Zotero.Jasminum.updateItems(items);
        } else {
            await zp.selectItem(newItem.id);
        }
        Zotero.debug("** Jasminum finished.");
    },

    checkItemPDF: function (item) {
        return (
            item.isAttachment() &&
            item.attachmentContentType &&
            item.attachmentContentType === "application/pdf" &&
            escape(item.getFilename()).indexOf("%u") < 0
        ); // Contain Chinese
    },

    getChapterUrl: async function (itemUrl) {
        Zotero.debug("** Jasminum get chapter url.");
        var respText = await Zotero.Jasminum.promiseGet(itemUrl);
        var parser = new DOMParser();
        var respHTML = parser.parseFromString(respText, "text/html");
        var chapterDown = Zotero.Utilities.xpath(
            respHTML,
            "//a[contains(text(), '分章下载')]"
        );
        if (chapterDown.length === 0) {
            Zotero.debug("No chapter found.");
            return null;
        }
        var readerUrl = Zotero.Utilities.xpath(
            respHTML,
            "//a[contains(text(), '在线阅读')]"
        )[0].href;
        Zotero.debug("** Jasminum reader url: " + readerUrl);
        var respText = await Zotero.Jasminum.promiseGet(readerUrl);
        var parser = new DOMParser();
        var respHTML = parser.parseFromString(respText, "text/html");
        var chapterUrl = Zotero.Utilities.xpath(
            respHTML,
            "//iframe[@id='treeView']"
        )[0].getAttribute("src");
        Zotero.debug("** Jasminum chapter url: " + chapterUrl);
        return "https://kreader.cnki.net/Kreader/" + chapterUrl;
    },

    getBookmark: async function (item) {
        // demo url     https://kreader.cnki.net/Kreader/buildTree.aspx?dbCode=cdmd&FileName=1020622678.nh&TableName=CMFDTEMP&sourceCode=GHSFU&date=&year=2020&period=&fileNameList=&compose=&subscribe=&titleName=&columnCode=&previousType=_&uid=
        var parentItem = item.parentItem;
        var parentItemType = parentItem.itemTypeID; // theis = 7
        var itemUrl = "";
        var itemChapterUrl = "";

        if (
            parentItemType === 7 &&
            parentItem.getField("extra") &&
            parentItem.getField("extra").includes("cnki")
        ) {
            Zotero.debug("1");
            itemChapterUrl = parentItem.getField("extra");
        } else if (
            parentItemType === 7 &&
            parentItem.getField("url") &&
            parentItem.getField("url").includes("cnki")
        ) {
            Zotero.debug("2");
            itemUrl = parentItem.getField("url");
            itemChapterUrl = await Zotero.Jasminum.getChapterUrl(itemUrl);
        } else {
            Zotero.debug("3");
            var fileData = {
                keyword: parentItem.getField("title"),
                author:
                    parentItem.getCreator(0).lastName +
                    parentItem.getCreator(0).firstName,
            };
            var searchPrepareOut = await Zotero.Jasminum.searchPrepare(
                fileData
            );
            var targetRow = await Zotero.Jasminum.search(
                searchPrepareOut,
                fileData
            );
            itemUrl = targetRow.querySelector("a.fz14").href;
            itemChapterUrl = await Zotero.Jasminum.getChapterUrl(itemUrl);
            // 获取文献链接URL -> 获取章节目录URL
        }

        Zotero.debug("** Jasminum item chapter url: " + itemChapterUrl);
        var chapterText = await Zotero.Jasminum.promiseGet(itemChapterUrl);
        var parser = new DOMParser();
        var chapterHTML = parser.parseFromString(chapterText, "text/html");
        var tree = chapterHTML.getElementById("treeDiv");
        var rows = tree.querySelectorAll("tr");
        var rows_array = [];
        for (let row of rows) {
            Zotero.debug(row.textContent.trim());
            var cols = row.querySelectorAll("td");
            var level = cols.length - 1;
            var title = row.textContent.trim();
            var onclickText = cols[cols.length - 1]
                .querySelector("a")
                .getAttribute("onclick");
            var pageRex = onclickText.match(/CDMDNodeClick\('(\d+)'/);
            var page = pageRex[1];
            var bookmark = `BookmarkBegin\nBookmarkTitle: ${title}\nBookmarkLevel: ${level}\nBookmarkPageNumber: ${page}`;
            rows_array.push(bookmark);
        }
        var bookmark = rows_array.join("\n");
        return bookmark;
    },

    addBookmark: async function (item, bookmark) {
        Zotero.debug("** Jasminum add bookmark begin");
        Zotero.debug(item);
        let cacheFile = Zotero.getTempDirectory();
        cacheFile.append("bookmark.txt");
        let tmpDir = OS.Path.dirname(cacheFile.path);
        if (cacheFile.exists()) {
            cacheFile.remove(false);
        }

        let cachePDF = Zotero.getTempDirectory();
        cachePDF.append("output.pdf");
        if (cachePDF.exists()) {
            cachePDF.remove(false);
        }

        let encoder = new TextEncoder();
        let array = encoder.encode(bookmark);
        let promise = OS.File.writeAtomic(cacheFile.path, array, {
            tmpPath: cacheFile.path + ".tmp",
        });
        var pdftk = "C:\\Program Files (x86)\\PDFtk Server\\bin\\pdftk.exe";
        if (Zotero.isLinux) {
            pdftk = "/usr/bin/pdftk";
        } else if (Zotero.isMac) {
            pdftk = "Path in mac"; // TODO
        }

        var args = [
            item.getFilePath(),
            "update_info_utf8",
            cacheFile.path,
            "output",
            cachePDF.path,
        ];
        Zotero.debug(
            "PDFtk: Running " +
                pdftk +
                " " +
                args.map((arg) => "'" + arg + "'").join(" ")
        );
        try {
            await Zotero.Utilities.Internal.exec(pdftk, args);
            Zotero.debug("PDFtk: Add bookmark:");
            await Zotero.Jasminum.updateBookmarkAttachment(item, cachePDF.path);
            cacheFile.remove(false);
            cachePDF.remove(false);
            Zotero.debug("** Jasminum add bookmark complete!");
        } catch (e) {
            Zotero.logError(e);
            try {
                cacheFile.remove(false);
            } catch (e) {
                Zotero.logError(e);
            }
            throw new Zotero.Exception.Alert("PDFtk add bookmark failed.");
        }
    },

    updateBookmarkAttachment: async function (item, markedpdf) {
        var parentItem = item.parentItem;
        var parentItemID = parentItem.id;
        var libraryID = parentItem.libraryID;
        var fileBaseName = item.getFilename();
        Zotero.debug(parentItemID + fileBaseName + markedpdf + libraryID);
        var file = markedpdf;
        var newItem = await Zotero.Attachments.importFromFile({
            file,
            libraryID,
            fileBaseName,
            parentItemID,
        });
        await newItem.saveTx();
        // delete old attachment
        Zotero.Items.erase(item.id);
    },

    addBookmarkItem: async function (item) {
        var bookmark = await Zotero.Jasminum.getBookmark(item);
        await Zotero.Jasminum.addBookmark(items[0], bookmark);
    },
};

window.addEventListener(
    "load",
    function (e) {
        Zotero.Jasminum.init();
        if (window.ZoteroPane) {
            var doc = window.ZoteroPane.document;
            // add event listener for zotfile menu items
            doc.getElementById("zotero-itemmenu").addEventListener(
                "popupshowing",
                Zotero.Jasminum.displayMenuitem,
                false
            );
        }
    },
    false
);
