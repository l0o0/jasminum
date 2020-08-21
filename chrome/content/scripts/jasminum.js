Zotero.Jasminum = {
    init: async function () {
        // Register the callback in Zotero as an item observer
        var notifierID = Zotero.Notifier.registerObserver(
            Zotero.Jasminum.notifierCallback,
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
        Zotero.Jasminum.initPref();
        Components.utils.import("resource://gre/modules/osfile.jsm");
        Zotero.debug("Init Jasminum ...");
    },

    initPref: function () {
        if (Zotero.Prefs.get("jasminum.pdftkpath") === undefined) {
            var pdftkpath = "C:\\Program Files (x86)\\PDFtk Server\\bin";
            if (Zotero.isMac || Zotero.isLinux) {
                pdftkpath = "/usr/bin";
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
    },

    notifierCallback: {
        // Check new added item, and adds meta data.
        notify: function (event, type, ids, extraData) {
            // var automatic_pdf_download_bool = Zotero.Prefs.get('zoteroscihub.automatic_pdf_download');
            if (event == "add" && Zotero.Prefs.get("jasminum.autoupdate")) {
                Zotero.debug("** Jasminum new items added.");
                var items = [];
                for (let item of Zotero.Items.get(ids)) {
                    if (Zotero.Jasminum.checkItem(item)) {
                        items.push(item);
                    }
                }
                Zotero.debug(`** Jasminum add ${items.length} items`);
                Zotero.Jasminum.updateItems(items);
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
        var showMenuName = items.some((item) =>
            Zotero.Jasminum.checkItemName(item)
        );
        pane.document.getElementById(
            "zotero-itemmenu-jasminum-namehandler"
        ).hidden = !showMenuName;
        var showMenuPDF = false;
        if (items.length === 1) {
            showMenuPDF = Zotero.Jasminum.checkItemPDF(items[0]);
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
        var patent = Zotero.Prefs.get("jasminum.namepatent");
        var patentArr = patent.split("_");
        var prefix = filename.substr(0, filename.length - 4);
        var prefix = prefix.replace("_省略_", ""); // Long title contains _省略_
        var author = "";
        var title = "";
        // Remove year string
        if (patent.includes("{%y}")) {
            patentArr.splice(patentArr.indexOf("{%y}"), 1);
            prefix = prefix.replace(/[0-9]{4}[\._]/g, "");
        }
        var prefixArr = prefix.replace(/^_|_$/g, "").split("_");
        console.log(patentArr);
        console.log(prefixArr);
        if (patentArr.includes("{%g}")) {
            var authorIdx = patentArr.indexOf("{%g}");
            var authorIdx = authorIdx === 0 ? 0 : prefixArr.length - 1;
            console.log(authorIdx);
            author = prefixArr[authorIdx];
            prefixArr.splice(authorIdx, 1);
            title = prefixArr.join(" ");
        } else {
            title = prefixArr.join(" ");
        }

        return {
            author: author.replace(",", ""),
            keyword: title,
        };
    },

    setCookieSandbox: function () {
        var cookieData =
            "Ecp_ClientId=5191230153502598871; cnkiUserKey=ee10ba99-62af-5b83-d845-2b5c7b5c6d1a; _pk_ref=%5B%22%22%2C%22%22%2C1597801224%2C%22https%3A%2F%2Fwww.cnki.net%2F%22%5D; Ecp_IpLoginFail=200819115.236.162.162; ASP.NET_SessionId=m5y1r25x4ycq4f3o5r3uboow; SID_kns8=kns8011103; CurrSortField=%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2f(%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2c%27TIME%27); CurrSortFieldType=desc";
        var userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
        var url = "https://kns8.cnki.net/nindex/";
        var sandbox = new Zotero.CookieSandbox("", url, cookieData, userAgent);
        Zotero.Jasminum.CookieSandbox = sandbox;
    },

    createPostData: function (fileData) {
        var postData =
            'IsSearch=true&QueryJson={"Platform":"","DBCode":"SCDB",' +
            '"KuaKuCode":"CJFQ,CCND,CIPD,CDMD,CYFD,BDZK,SCOD,CISD,SNAD,CCJD,GXDB' +
            '_SECTION,CJFN","QNode":{"QGroup":[{"Key":"Subject","Title":"","Logic"' +
            ':4,"Items":[],"ChildItems":[{"Key":"input[data-tipid=gradetxt-1]",' +
            '"Title":"篇名","Logic":0,"Items":[{"Key":"","Title":"TITLE","Logic":1,' +
            '"Name":"SU","Operate":"%=","Value":"TITLE","ExtendType":1,"ExtendValue"' +
            ':"中英文对照","Value2":""}],"ChildItems":[]},{"Key":"input[data-tipid=' +
            'gradetxt-2]","Title":"作者","Logic":1,"Items":[{"Key":"","Title":"AUTHOR' +
            '","Logic":1,"Name":"AU","Operate":"=","Value":"AUTHOR","ExtendType":1,' +
            '"ExtendValue":"中英文对照","Value2":""}],"ChildItems":[]}]},{"Key":' +
            '"ControlGroup","Title":"","Logic":1,"Items":[],"ChildItems":[]},{"Key"' +
            ':"NaviParam","Title":"","Logic":1,"Items":[{"Key":"navi","Title":"",' +
            '"Logic":1,"Name":"专题子栏目代码","Operate":"=","Value":"","ExtendType"' +
            ':13,"ExtendValue":"","Value2":"","BlurType":""}],"ChildItems":[]}]}}' +
            "PageName=AdvSearch&HandlerId=0&DBCode=SCDB&KuaKuCodes=CJFQ,CCND,CIPD," +
            "CDMD,CYFD,BDZK,SCOD,CISD,SNAD,CCJD,GXDB_SECTION,CJFN&CurPage=1&" +
            "RecordsCntPerPage=20&CurDisplayMode=listmode&CurrSortField=发表时间/" +
            "(发表时间,'TIME')&CurrSortFieldType=desc&IsSortSearch=false&IsSentenceSearch=false";
        postData = postData.replace(/TITLE/g, fileData.keyword);
        postData = postData.replace(/AUTHOR/g, fileData.author);
        return encodeURI(postData);
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
            !dbcode[1]
        )
            return false;
        return { dbname: dbname[1], filename: filename[1], dbcode: dbcode[1] };
    },

    promiseGet: function (url) {
        Zotero.debug("** Jasminum create http get.");
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.onload = function () {
                if (this.status === 200) {
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

    search: async function (fileData) {
        Zotero.debug("**Jasminum start search");
        var postData = Zotero.Jasminum.createPostData(fileData);
        var requestHeaders = {
            Host: "kns8.cnki.net",
            Connection: "keep-alive",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Origin: "https://kns8.cnki.net",
            "X-Requested-With": "XMLHttpRequest",
            Referer: "https://kns8.cnki.net/kns/AdvSearch?dbcode=CJFQ",
        };
        var postUrl = "https://kns8.cnki.net/kns/Brief/GetGridTableHtml";
        if (!Zotero.Jasminum.CookieSandbox) {
            Zotero.Jasminum.setCookieSandbox();
        }
        Zotero.debug(Zotero.Jasminum.CookieSandbox);
        var resp = await Zotero.HTTP.request("POST", postUrl, {
            headers: requestHeaders,
            cookieSandbox: Zotero.Jasminum.CookieSandbox,
            body: postData,
        });
        Zotero.debug(resp.responseText);
        var targetRow = Zotero.Jasminum.getSearchItems(resp.responseText);
        return targetRow;
    },

    getSearchItems: function (resptext) {
        Zotero.debug("**Jasminum get item from search");
        var parser = new DOMParser();
        var html = parser.parseFromString(resptext, "text/html");
        var rows = html.querySelectorAll(
            "table.result-table-list > tbody > tr"
        );
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
        var targetUrl = targetRow
            .getElementsByClassName("fz14")[0]
            .getAttribute("href");
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
        var data = data.replace(/vo (\d+)\n/, "VO $1\n"); // Divide VO and IS to different line.
        targetUrl = `https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=${targetID.dbcode}&dbname=${targetID.dbname}&filename=${targetID.filename}&v=`;
        Zotero.debug(data);
        return [data, targetUrl];
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

        let newItems = await translate.translate({
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

    fixItem: function (newItem, targetUrl) {
        // 是否处理中文姓名
        if (Zotero.Prefs.get("jasminum.zhnamesplit")) {
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
        }
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
        newItem.setField("url", targetUrl);
        // Keep tags according global config.
        if (Zotero.Prefs.get("automaticTags") === false) {
            newItem.tags = [];
        } else {
            // Change tag type.
            var tags = newItem.getTags();
            if (tags.length > 0) {
                var newTags = [];
                for (let tag of tags) {
                    tag.type = 1;
                    newTags.push(tag);
                }
                newItem.setTags(newTags);
            }
        }
        if (newItem.getNotes()) {
            Zotero.Items.erase(newItem.getNotes());
        }
        return newItem;
    },

    updateItems: async function (items) {
        if (items.length == 0) return;
        var item = items.shift();
        var itemCollections = item.getCollections();
        var libraryID = item.libraryID;
        if (!Zotero.Jasminum.checkItem(item)) return; // TODO Need notify
        var fileData = Zotero.Jasminum.splitFilename(item.getFilename());
        Zotero.debug(fileData);
        var targetRow = await Zotero.Jasminum.search(fileData);
        Zotero.debug("targetRow");
        Zotero.debug(targetRow.textContent);
        var [data, targetUrl] = await Zotero.Jasminum.getRefworks(targetRow);
        var translate = new Zotero.Translate.Import();
        translate.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86");
        translate.setString(data);
        var newItem = await Zotero.Jasminum.promiseTranslate(
            translate,
            libraryID
        );
        Zotero.debug(newItem);
        newItem = Zotero.Jasminum.fixItem(newItem, targetUrl);
        Zotero.debug("** Jasminum DB trans ...");
        if (itemCollections.length) {
            for (let collectionID of itemCollections) {
                newItem.addToCollection(collectionID);
            }
        }

        // Put old item as a child of the new item
        item.parentID = newItem.id;
        await item.saveTx();
        await newItem.saveTx();
        if (items.length) {
            Zotero.Jasminum.updateItems(items);
        }
        Zotero.debug("** Jasminum finished.");
    },

    checkItemPDF: function (item) {
        return (
            !item.isTopLevelItem() &&
            item.isAttachment() &&
            item.attachmentContentType &&
            item.attachmentContentType === "application/pdf" &&
            item.parentItem.getField("libraryCatalog") &&
            item.parentItem.getField("libraryCatalog").includes("CNKI") &&
            Zotero.ItemTypes.getName(item.parentItem.itemTypeID) === "thesis"
        );
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
        )[0].getAttribute("href");
        Zotero.debug("** Jasminum reader url: " + readerUrl);
        var respText = await Zotero.Jasminum.promiseGet(readerUrl);
        var parser = new DOMParser();
        var respHTML = parser.parseFromString(respText, "text/html");
        var chapterUrl = Zotero.Utilities.xpath(
            respHTML,
            "//iframe[@id='treeView']"
        )[0].getAttribute("src");
        Zotero.debug("** Jasminum chapter url: " + chapterUrl);
        return "https://kreader.cnki.net/Kreader" + chapterUrl;
    },

    getBookmark: async function (item) {
        // demo url     https://kreader.cnki.net/Kreader/buildTree.aspx?dbCode=cdmd&FileName=1020622678.nh&TableName=CMFDTEMP&sourceCode=GHSFU&date=&year=2020&period=&fileNameList=&compose=&subscribe=&titleName=&columnCode=&previousType=_&uid=
        var parentItem = item.parentItem;
        var itemUrl = "";
        var itemChapterUrl = "";
        if (
            // 匹配知网 URL
            parentItem.getField("url") &&
            parentItem.getField("url").match(/^https?:\/\/([^/]+\.)?cnki\.net/)
        ) {
            Zotero.debug("2");
            itemUrl = parentItem.getField("url");
            Zotero.debug("** Jasminum item url: " + itemUrl);
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
            itemUrl = targetRow.querySelector("a.fz14").getAttribute("href");
            itemUrl = "https://kns.cnki.net/KCMS" + itemUrl.slice(4);
            // 获取文献链接URL -> 获取章节目录URL
        }
        itemChapterUrl = await Zotero.Jasminum.getChapterUrl(itemUrl);
        Zotero.debug("** Jasminum item url: " + itemUrl);
        Zotero.debug("** Jasminum item chapter url: " + itemChapterUrl);
        // Next line raises: Invalid chrome URI: /
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
        // Zotero.debug(item);
        let cacheFile = Zotero.getTempDirectory();
        let cachePDF = Zotero.getTempDirectory();
        // PDFtk will throw errors when args contains Chinese character
        // So create a tmp folder.
        if (Zotero.isWin) {
            var newTmp = OS.Path.join(cacheFile.path.slice(0, 3), "tmp");
            Zotero.debug("** Jasminum new tmp path " + newTmp);
            cacheFile = Zotero.getTempDirectory();
            cachePDF = Zotero.getTempDirectory();
            cacheFile.initWithPath(newTmp);
            cachePDF.initWithPath(newTmp);
            if (!cacheFile.exists()) {
                cacheFile.create(
                    Components.interfaces.nsIFile.DIRECTORY_TYPE,
                    0777
                );
            }
        }
        cacheFile.append("bookmark.txt");
        if (cacheFile.exists()) {
            cacheFile.remove(false);
        }

        cachePDF.append("output.pdf");
        if (cachePDF.exists()) {
            cachePDF.remove(false);
        }

        let encoder = new TextEncoder();
        let array = encoder.encode(bookmark);
        let promise = OS.File.writeAtomic(cacheFile.path, array, {
            tmpPath: cacheFile.path + ".tmp",
        });
        var pdftk = Zotero.Prefs.get("jasminum.pdftkpath");
        if (Zotero.isWin) {
            pdftk = OS.Path.join(pdftk, "pdftk.exe");
        } else {
            pdftk = OS.Path.join(pdftk, "pdftk");
        }
        Zotero.debug("** Jasminum pdftk path: " + pdftk);
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
                cachePDF.remove(false);
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
        var fileBaseName = OS.Path.basename(
            OS.Path.normalize(item.getFilename())
        ).replace(/\.pdf/g, "");
        Zotero.debug(parentItemID + fileBaseName + markedpdf + libraryID);
        var file = markedpdf;
        var newItem = await Zotero.Attachments.importFromFile({
            file,
            libraryID,
            fileBaseName,
            parentItemID,
        });
        // Transfer notes, tags and related item to the new PDF.
        var tags = item.getTags();
        var note = item.getNote();
        if (note != "") newItem.setNote(note);
        if (tags.length) newItem.setTags(tags);
        newItem.setRelations(item.getRelations());

        await newItem.saveTx();
        // delete old attachment
        Zotero.Items.erase(item.id);
    },

    addBookmarkItem: async function () {
        var item = ZoteroPane.getSelectedItems()[0];
        if (!(await Zotero.Jasminum.checkPath())) {
            alert(
                "Can't find PDFtk Server execute file. Please install PDFtk Server and choose the folder in the Jasminum preference window."
            );
            return false;
        }
        // Show alert when file is missing
        var attachmentExists = await OS.File.exists(item.getFilePath());
        if (!attachmentExists) {
            alert("Item Attachment file is missing.");
            return false;
        }
        var bookmark = await Zotero.Jasminum.getBookmark(item);
        await Zotero.Jasminum.addBookmark(item, bookmark);
    },

    checkPath: async function () {
        Zotero.debug("** Jasminum check path.");
        var pdftkpath = Zotero.Prefs.get("jasminum.pdftkpath");
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

    checkItemName: function (item) {
        return item.isRegularItem() && item.isTopLevelItem();
    },

    splitName: async function () {
        var items = ZoteroPane.getSelectedItems();
        for (let item of items) {
            var creators = item.getCreators();
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                if (
                    // English Name pass
                    creator.lastName.search(/[A-Za-z]/) !== -1 ||
                    creator.firstName.search(/[A-Za-z]/) !== -1 ||
                    creator.firstName // 如果有姓就不拆分了
                ) {
                    continue;
                }

                var chineseName = creator.lastName
                    ? creator.lastName
                    : creator.firstName;
                creator.lastName = chineseName.charAt(0);
                creator.firstName = chineseName.substr(1);
                creator.fieldMode = 0;
                creators[i] = creator;
            }
            if (creators != item.getCreators()) {
                item.setCreators(creators);
                item.saveTx();
            }
        }
    },

    mergeName: async function () {
        var items = ZoteroPane.getSelectedItems();
        for (let item of items) {
            var creators = item.getCreators();
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                if (
                    // English Name pass
                    creator.lastName.search(/[A-Za-z]/) !== -1 ||
                    creator.lastName.search(/[A-Za-z]/) !== -1
                ) {
                    continue;
                }
                creator.lastName = creator.lastName + creator.firstName;
                creator.firstName = "";
                creator.fieldMode = 1;
                creators[i] = creator;
            }
            if (creators != item.getCreators()) {
                item.setCreators(creators);
                item.saveTx();
            }
        }
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
