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
        Components.utils.import("resource://zotero/q.js");
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
        Zotero.debug("selected item length: " + items.length);
        var show_menu = items.some((item) => Zotero.Jasminum.checkItem(item));
        pane.document.getElementById(
            "zotero-itemmenu-jasminum"
        ).hidden = !show_menu;
        pane.document.getElementById(
            "id-jasminum-separator"
        ).hidden = !show_menu;
        Zotero.debug("show menu: " + show_menu);
    },

    updateSelectedEntity: function (libraryId) {
        Zotero.debug("Updating items in entity");
        if (!ZoteroPane.canEdit()) {
            ZoteroPane.displayCannotEditLibraryMessage();
            return;
        }

        var collection = ZoteroPane.getSelectedCollection(false);

        if (collection) {
            Zotero.debug("Updating items in entity: Is a collection == true");
            var items = [];
            collection.getChildItems(false, false).forEach(function (item) {
                items.push(item);
            });
            suppress_warnings = true;
            Zotero.Jasminum.updateItems(items, suppress_warnings);
        }
    },

    updateSelectedItems: function () {
        Zotero.debug("Updating Selected items");
        suppress_warnings = false;
        Zotero.Jasminum.updateItems(
            ZoteroPane.getSelectedItems(),
            suppress_warnings
        );
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

        var filename = item.attachmentFilename();
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
        Zotero.debug("select window start");
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
        if (
            !dbname ||
            !dbname[1] ||
            !filename ||
            !filename[1] ||
            dbname[1].match("TEMP$")
        )
            return false;
        return { dbname: dbname[1], filename: filename[1] };
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

    cleanItem: function () {
        Zotero.debug("clean parent");
    },

    searchPrepare: function (url, fileData) {
        Zotero.debug("start prepare");
        var request = new XMLHttpRequest();
        var deferred = Q.defer();

        request.open("GET", url, true);
        request.onload = onload;
        request.onerror = onerror;
        request.onprogress = onprogress;
        request.send();

        function onload() {
            if (request.status === 200) {
                deferred.resolve([request.responseText, fileData]);
            } else {
                deferred.reject(
                    new Error(
                        "Search Prepare Status code was " + request.status
                    )
                );
            }
        }

        function onerror() {
            deferred.reject(new Error("Can't XHR " + JSON.stringify(url)));
        }

        return deferred.promise;
    },

    search: function (searchPrepareout) {
        Zotero.debug("start search");
        var request = new XMLHttpRequest();
        var deferred = Q.defer();
        var keyword = encodeURI(searchPrepareout[1].keyword);
        Zotero.debug(searchPrepareout);
        Zotero.debug("keyword: " + keyword);
        var resultUrl =
            "https://kns.cnki.net/kns/brief/brief.aspx?pagename=" +
            searchPrepareout[0] +
            `&t=${Date.parse(new Date())}&keyValue=${keyword}&S=1&sorttype=`;
        Zotero.debug(resultUrl);
        request.open("GET", resultUrl, true);
        request.onload = onload;
        request.onerror = onerror;
        request.onprogress = onprogress;
        request.send();

        function onload() {
            if (request.status === 200) {
                // Zotero.debug(request.responseText);
                deferred.resolve(
                    Zotero.Jasminum.getSearchItems(request.responseText)
                );
            } else {
                deferred.reject(
                    new Error("Search Status code was " + request.status)
                );
            }
        }

        function onerror() {
            deferred.reject(new Error("Can't XHR " + JSON.stringify(url)));
        }

        return deferred.promise;
    },

    getSearchItems: function (resptext) {
        Zotero.debug("get item from search");
        var parser = new DOMParser();
        var html = parser.parseFromString(resptext, "text/html");
        var rows = html.querySelectorAll("table.GridTableContent > tbody > tr");
        Zotero.debug("搜索结果：" + (rows.length - 1));
        var targetRow;
        if (rows.length <= 1) {
            Zotero.debug("No items found.");
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

    getRefworks: function (targetRow) {
        Zotero.debug("start get ref");
        var request = new XMLHttpRequest();
        var deferred = Q.defer();

        if (targetRow == null) {
            deferred.reject(new Error("No items returned from the CNKI"));
        }

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
        request.open(
            "GET",
            "https://kns.cnki.net/kns/ViewPage/viewsave.aspx?displayMode=Refworks&" +
                postData,
            true
        );
        request.onload = onload;
        request.onerror = onerror;
        request.onprogress = onprogress;
        request.send();

        function onload() {
            if (request.status === 200) {
                var resp = request.responseText;
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
                    .replace(/^(A[1-4]|U2)\s*([^\r\n]+)/gm, function (
                        m,
                        tag,
                        authors
                    ) {
                        authors = authors.split(/\s*[;，,]\s*/); // that's a special comma
                        if (!authors[authors.length - 1].trim()) authors.pop();
                        return tag + " " + authors.join("\n" + tag + " ");
                    });
                Zotero.debug(data);
                deferred.resolve(data);
            } else {
                deferred.reject(
                    new Error("Get Reference Status code was " + request.status)
                );
            }
        }

        function onerror() {
            deferred.reject(new Error("Can't XHR " + JSON.stringify(url)));
        }

        return deferred.promise;
    },

    promiseTranslate: function (translate, libraryID) {
        Zotero.debug("start translate");
        var deferred = Q.defer();
        translate.setHandler("itemDone", function (translate, newItem) {
            Zotero.debug(newItem);
            Zotero.debug("作者数目：" + newItem.getCreators().length);
            for (var i = 0, n = newItem.getCreators().length; i < n; i++) {
                var creator = newItem.getCreators()[i];
                if (creator.ref.firstName) continue;

                var lastSpace = creator.ref.lastName.lastIndexOf(" ");
                if (
                    creator.ref.lastName.search(/[A-Za-z]/) !== -1 &&
                    lastSpace !== -1
                ) {
                    // western name. split on last space
                    creator.ref.firstName = creator.ref.lastName.substr(
                        0,
                        lastSpace
                    );
                    creator.ref.lastName = creator.ref.lastName.substr(
                        lastSpace + 1
                    );
                } else {
                    // Chinese name. first character is last name, the rest are first name
                    creator.ref.firstName = creator.ref.lastName.substr(1);
                    creator.ref.lastName = creator.ref.lastName.charAt(0);
                }
            }
            // Clean up tags. Remove numbers from end
            for (var j = 0, l = newItem.getTags().length; j < l; j++) {
                newItem.getTags()[j].name = newItem
                    .getTags()
                    [j].name.replace(/:\d+$/, "");
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
            if (newItem.getField("callNumber")) {
                //	newItem.extra = 'CN ' + newItem.callNumber;
                newItem.setField("callNumber", "");
            }
            // Remove note
            if (newItem.getNotes()) {
                Zotero.Items.erase(newItem.getNotes());
            }
            newItem.setField("libraryCatalog", "CNKI");
        });

        translate.setHandler("done", function (translate, success) {
            if (success && translate.newItems.length) {
                Zotero.debug("112");
                Zotero.debug(translate.newItems[0]);
                deferred.resolve(translate.newItems[0]);
            } else {
                deferred.reject(
                    translate.translator && translate.translator.length
                        ? "Translation with " +
                              translate.translator.map((t) => t.label) +
                              " failed"
                        : "Could not find a translator for given search item"
                );
            }
        });
        translate.translate(libraryID, false);
        return deferred.promise;
    },

    updateItems: function (items, suppress_warnings) {
        if (items.length == 0) return;
        var item = items.shift();
        var itemCollections = item.getCollections();
        var libraryID = item.libraryID;
        // for(var j=0; j<itemCollections.length; j++) {
        // 	var collection = Zotero.Collections.get(itemCollections[j]);
        // 	collection.addItem(newItem.id);
        // }
        if (!Zotero.Jasminum.checkItem(item)) return;
        var fileData = Zotero.Jasminum.splitFilename(item.attachmentFilename());
        var searchData = Zotero.Jasminum.createPost(fileData);
        var httpPost = new XMLHttpRequest();
        var SEARCH_HANDLE_URL =
            "https://kns.cnki.net/kns/request/SearchHandler.ashx";
        var url = SEARCH_HANDLE_URL + "?" + searchData;
        Zotero.Jasminum.searchPrepare(url, fileData)
            .then((searchPrepareout) =>
                Zotero.Jasminum.search(searchPrepareout)
            )
            .then((targetRow) => Zotero.Jasminum.getRefworks(targetRow))
            .then(function (data) {
                var translate = new Zotero.Translate.Import();
                translate.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86");
                translate.setString(data);
                return Zotero.Jasminum.promiseTranslate(translate, libraryID);
            })
            .then(function (newItem) {
                Zotero.debug("last");
                Zotero.debug(newItem);
                for (var j = 0; j < itemCollections.length; j++) {
                    var collection = Zotero.Collections.get(itemCollections[j]);
                    collection.addItem(newItem.id);
                }
                // Put old item to new item.
                item.setSource(newItem.id);
                item.save();
                if (items.length) {
                    Zotero.Jasminum.updateItems(items, suppress_warnings);
                }
            });
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
