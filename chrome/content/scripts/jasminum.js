Zotero.Jasminum = {
  init: function () {
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
  },
  notifierCallback: {
    // Check new added item, and adds meta data.
    // TODO Add a check function here
    notify: function (event, type, ids, extraData) {
      // var automatic_pdf_download_bool = Zotero.Prefs.get('zoteroscihub.automatic_pdf_download');
      if (event == "add") {
        suppress_warnings = true;
        Zotero.Jasminum.updateItems(Zotero.Items.get(ids), suppress_warnings);
      }
    },
  },

  displayMenuitem: function () {
    var pane = Services.wm.getMostRecentWindow("navigator:browser").ZoteroPane;
    var items = pane.getSelectedItems();
    var show_menu = items.some(item => Zotero.Jasminum.checkItem(item));
    pane.document.getElementById("zotero-itemmenu-jasminum").hidden = !show_menu;
    pane.document.getElementById("id-jasminum-separator").hidden = !show_menu;
    console.log(show_menu);
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
//   updateAll: function () {
//     Zotero.debug("Updating all items in Zotero");
//     var items = [];

//     // Get all items
//     Zotero.Items.getAll().then(function (items) {
//       // Once we have all items, make sure it's a regular item.
//       // And that the library is editable
//       // Then add that item to our list.
//       items.map(function (item) {
//         if (item.isRegularItem() && !item.isCollection()) {
//           var libraryId = item.getField("libraryID");
//           if (
//             libraryId == null ||
//             libraryId == "" ||
//             Zotero.Libraries.isEditable(libraryId)
//           ) {
//             items.push(item);
//           }
//         }
//       });
//     });
//     // Update all of our items with pdfs.
//     suppress_warnings = true;
//     Zotero.Jasminum.updateItems(items, suppress_warnings);
//   },

  checkItem: function (item) {
    // filename like author_title.ext, ext=pdf/caj
    if (!item.isAttachment()) return false;
    var filename = item.getFilename();
    var ext = filename.substr(filename.length - 3, 3);
    if (ext != "pdf" && ext != "caj") return false;
    return true;
  },

  splitFilename: function (filename) {
    // Make query parameters from filename
    var prefix = filename.substr(0, filename.length - 4);
    var prefixArr = prefix.split("_");
    return {
      author: prefixArr[0],
      keyword: prefixArr[1],
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
      DbPrefix: "CJFQ",
      DbCatalog: "中国学术期刊网络出版总库",
      ConfigFile: "CJFQ.xml",
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
      encodeURIComponent(targetID.dbname + "!" + targetID.filename + "!1!0,") +
      "&hid_kLogin_headerUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F" +
      "&hid_KLogin_FooterUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F" +
      "&CookieName=FileNameS";
  },

  updateItems: function (items, suppress_warnings) {
    if (items.length == 0) return;
    var item = items.shift();
    if (!Zotero.Jasminum.checkItem(item)) return;
    var fileData = Zotero.Jasminum.splitFilename(item.getFilename());
    var searchData = Zotero.Jasminum.createPost(fileData);
    var httpPost = new XMLHttpRequest();
    var SEARCH_HANDLE_URL =
      "https://kns.cnki.net/kns/request/SearchHandler.ashx";
    var url = SEARCH_HANDLE_URL + "?" + searchData;
    httpPost.open("get", url, true);
    httpPost.send();
    httpPost.onload = function () {
      var resp = httpPost.responseText;
      console.log(resp);
      var keyword = encodeURI(fileData.keyword);
      var resultUrl =
        "https://kns.cnki.net/kns/brief/brief.aspx?pagename=" +
        resp +
        `&t=${Date.parse(new Date())}&keyValue=${keyword}&S=1&sorttype=`;
      var resultGet = new XMLHttpRequest();
      resultGet.open("get", resultUrl, true);
      resultGet.send();
      resultGet.onload = function () {
        var resultResp = resultGet.responseText;
        var parser = new DOMParser();
        var html = parser.parseFromString(resultResp, "text/html");
        // //table[@class='GridTableContent']//tr[not (@class)]
        var rows = html.querySelectorAll("table.GridTableContent > tbody > tr");
        console.log(rows.length);
        // Get the right item from search result.
        var rowIndicators = {};
        for (let idx = 1; idx < rows.length; idx++) {
          var rowText = rows[idx].textContent.split(/\s+/).join(" ");
          rowIndicators[rowText] = idx;
          console.log(rowText);
        }
        var targetIndicator = Zotero.Jasminum.selectRow(rowIndicators);
        var targetRow = rows[Object.values(targetIndicator)[0]];
        // Retrive selected item meta data.
        var targetUrl = targetRow.getElementsByClassName("fz14")[0].href;
        var targetID = Zotero.Jasminum.getIDFromUrl(targetUrl);
        console.log(targetID);
        // Get reference data from CNKI by ID.
        var httpRequest = new XMLHttpRequest();
        var postData = "formfilenames=" + encodeURIComponent(targetID.dbname + "!" + targetID.filename + "!1!0,")
		    + '&hid_kLogin_headerUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F'
		    + '&hid_KLogin_FooterUrl=/KLogin/Request/GetKHeader.ashx%3Fcallback%3D%3F'
		    + '&CookieName=FileNameS';
        httpRequest.open(
          "GET",
          "https://kns.cnki.net/kns/ViewPage/viewsave.aspx?displayMode=Refworks&" +
            postData,
          true
        );
        httpRequest.send();
        httpRequest.onreadystatechange = function () {
          if (httpRequest.readyState == 4 && httpRequest.status == 200) {
            var resp = httpRequest.responseText;
            // console.log(resp);
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
            console.log(data);
          }
        };
      };
    };
  },
};

window.addEventListener(
  "load",
  function (e) {
    Zotero.Jasminum.init();
    if(window.ZoteroPane) {
        var doc = window.ZoteroPane.document;
        // add event listener for zotfile menu items
        doc.getElementById('zotero-itemmenu').addEventListener('popupshowing', Zotero.Jasminum.displayMenuitem, false);
    }
  },
  false
);
