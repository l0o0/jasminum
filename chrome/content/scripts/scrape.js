Zotero.Jasminum.Scrape = new function () {
    this.splitFilename = function (filename) {
        // Make query parameters from filename
        var patent = Zotero.Prefs.get("jasminum.namepatent");
        var prefix = filename.replace(/\.\w+$/, ''); // 删除文件后缀
        var prefix = prefix.replace(/\.ashx$/g, ""); // 删除末尾.ashx字符
        prefix = prefix.replace(/^_|_$/g, '');  // 删除前后的下划线
        // 当文件名模板为"{%t}_{%g}"，文件名无下划线_时，将文件名认定为标题
        if (patent === "{%t}_{%g}" && !prefix.includes("_")) {
            return {
                author: "",
                keyword: prefix,
            };
        }
        var patentSepArr = patent.split(/{%[^}]+}/);
        var patentSepRegArr = patentSepArr.map(x => x.replace(/([\[\\\^\$\.\|\?\*\+\(\)])/g, '\\$&'));
        var patentMainArr = patent.match(/{%[^}]+}/g);
        //文件名中的作者姓名字段里不能包含下划线，请使用“&,，”等字符分隔多个作者，或仅使用第一个作者名（加不加“等”都行）。
        var patentMainRegArr = patentMainArr.map(x => x.replace(/.+/, /{%y}/.test(x) ? '(\\d+)' : (/{%g}/.test(x) ? '([^_]+)' : '(.+)')));
        var regStrInterArr = patentSepRegArr.map((_, i) => [patentSepRegArr[i], patentMainRegArr[i]]);
        var patentReg = new RegExp([].concat.apply([], regStrInterArr).filter(Boolean).join(''), 'g');

        var prefixMainArr = patentReg.exec(prefix);
        // 文件名识别结果为空，跳出警告弹窗
        if (prefixMainArr === null) {
            this.Utils.showPopup(
                "Error in parsing filename",
                `文件名识别出错，请检查文件名识别模板与实际抓取文件名。文件名: ${filename}，识别模板为: ${patent}`,
                true
            )
            return;
        }
        var titleIdx = patentMainArr.indexOf('{%t}');
        var authorIdx = patentMainArr.indexOf('{%g}');
        var titleRaw = (titleIdx != -1) ? prefixMainArr[titleIdx + 1] : '';
        var authors = (authorIdx != -1) ? prefixMainArr[authorIdx + 1] : '';
        var authorArr = authors.split(/[,，&]/);
        var author = authorArr[0]
        if (authorArr.length == 1) {
            //删除名字后可能出现的“等”字，此处未能做到识别该字是否属于作者姓名。
            //这种处理方式的问题：假如作者名最后一个字为“等”，例如：“刘等”，此时会造成误删。
            //于是对字符数进行判断，保证删除“等”后，至少还剩两个字符，尽可能地避免误删。

            author = (author.endsWith('等') && author.length > 2) ? author.substr(0, author.length - 1) : author;
        }

        //为了避免文件名中的标题字段里存在如下两种情况而导致的搜索失败:
        //原标题过长，文件名出现“_省略_”；
        //原标题有特殊符号（如希腊字母、上下标）导致的标题变动，此时标题也会出现“_”。
        //于是只取用标题中用“_”分割之后的最长的部分作为用于搜索的标题。

        //这种处理方式的问题：假如“最长的部分”中存在知网改写的部分，也可能搜索失败。
        //不过这只是理论上可能存在的情形，目前还未实际遇到。

        var title;
        // Zotero.debug(titleRaw);
        // if (/_/.test(titleRaw)) {

        //     //getLongestText函数，用于拿到字符串数组中的最长字符
        //     //摘自https://stackoverflow.com/a/59935726
        //     const getLongestText = (arr) => arr.reduce(
        //         (savedText, text) => (text.length > savedText.length ? text : savedText),
        //         '',
        //     );
        //     title = getLongestText(titleRaw.split(/_/));
        // } else {
        //     title = titleRaw;
        // }

        // 去除_省略_ , 多余的 _ 换为空格
        // 标题中含有空格，查询时会启用模糊模式
        title = titleRaw.replace("_省略_", ' ');
        title = title.replace(/_/g, " ")
        return {
            author: author,
            keyword: title,
        };
    }.bind(Zotero.Jasminum);


    // Cookie for search
    this.setCookieSandbox = function () {
        var cookieData =
            "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
            "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
            "_pk_ref=%5B%22%22%2C%22%22%2C1604497317%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
            "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
            "SID_kns8=123121; " +
            "Ecp_IpLoginFail=20110839.182.10.65";
        var userAgent = this.userAgent;
        var url = "https://cnki.net/";
        this.CookieSandbox = new Zotero.CookieSandbox("", url, cookieData, userAgent);
    }.bind(Zotero.Jasminum);


    // Cookie for getting Refworks data
    this.setRefCookieSandbox = function () {
        var cookieData =
            "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
            "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
            "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
            "SID_kns8=123121; Ecp_IpLoginFail=20110839.182.10.65; " +
            "SID_recommendapi=125144; CurrSortFieldType=desc; " +
            "SID_kns=025123117; " +
            "CurrSortField=%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2f(%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2c%27TIME%27); " +
            "SID_kcms=124117; " +
            "_pk_ref=%5B%22%22%2C%22%22%2C1604847086%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
            "_pk_ses=*";
        var userAgent = this.userAgent;
        var url = "https://cnki.net/";
        this.RefCookieSandbox = new Zotero.CookieSandbox("", url, cookieData, userAgent);
    }.bind(Zotero.Jasminum);

    /**
     * Create post data for CNKI reference url
     * @param {[id]} Array of getIDFromUrl
     * @return {String} 
     */
    this.createRefPostData = function (ids) {
        var postData = "filename=";
        // filename=CPFDLAST2020!ZGXD202011001016!1!14%2CCPFDLAST2020!ZKBD202011001034!2!14&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542
        for (let idx = 0; idx < ids.length; idx++) {
            postData =
                postData +
                ids[idx].dbname +
                "!" +
                ids[idx].filename +
                "!" +
                (idx + 1) +
                "!8%2C";
        }
        postData = postData.replace(/%2C$/g, "");
        postData =
            postData +
            "&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542";
        return postData;
    }.bind(Zotero.Jasminum);

    /**
     * Create post data for CNKI result
     */
    this.createPostData = function (fileData) {
        var searchKeyword = fileData.keyword.replace(/ /g, '+');
        var searchIdx = 1;
        var queryJson = {
            Platform: "",
            DBCode: "SCDB",
            KuaKuCode:
                "CJFQ,CDMD,CIPD,CCND,CYFD,SCOD,CISD,SNAD,BDZK,GXDB_SECTION,CJFN,CCJD",
            QNode: {
                QGroup: [
                    {
                        Key: "Subject",
                        Title: "",
                        Logic: 4,
                        Items: [],
                        ChildItems: [],
                    },
                    {
                        Key: "ControlGroup",
                        Title: "",
                        Logic: 1,
                        Items: [],
                        ChildItems: [],
                    }
                ],
            },
        };
        if (fileData.keyword) {
            // 如果标题中含有空格，增加主题关键词搜索
            if (fileData.keyword.includes(" ")) {
                titleChildItem = {
                    Key: `input[data-tipid=gradetxt-${searchIdx}]`,
                    Title: "主题",
                    Logic: 4,
                    Items: [
                        {
                            Key: "",
                            Title: searchKeyword,
                            Logic: 0,
                            Name: "SU",
                            Operate: "%=",
                            Value: searchKeyword,
                            ExtendType: 1,
                            ExtendValue: "中英文对照",
                            Value2: ""
                        }
                    ],
                    ChildItems: []
                };
                queryJson.QNode.QGroup[0].ChildItems.push(titleChildItem);
                searchIdx += 1;
            }

            var titleChildItem = {
                Key: `input[data-tipid=gradetxt-${searchIdx}]`,
                Title: "篇名",
                Logic: 2,
                Items: [
                    {
                        Key: "",
                        Title: searchKeyword,
                        Logic: 1,
                        Name: "TI", // 搜索字段代码
                        Operate: fileData.keyword.includes(" ") ? "%" : "=", // =精确匹配, % 模糊匹配
                        Value: searchKeyword,
                        ExtendType: 1,
                        ExtendValue: "中英文对照",
                        Value2: "",
                    },
                ],
                ChildItems: [],
            };
            queryJson.QNode.QGroup[0].ChildItems.push(titleChildItem);
            searchIdx += 1;
        }
        if (fileData.author) {
            var authorChildItem = {
                Key: `input[data-tipid=gradetxt-${searchIdx}]`,
                Title: "作者",
                Logic: 1,
                Items: [
                    {
                        Key: "",
                        Title: fileData.author,
                        Logic: 1,
                        Name: "AU",
                        Operate: "=",
                        Value: fileData.author,
                        ExtendType: 1,
                        ExtendValue: "中英文对照",
                        Value2: "",
                    },
                ],
                ChildItems: [],
            };
            queryJson.QNode.QGroup[0].ChildItems.push(authorChildItem);
            searchIdx += 1;
        }
        var postData =
            "IsSearch=true&QueryJson=" +
            encodeURIComponent(JSON.stringify(queryJson)) +
            "&PageName=DefaultResult&DBCode=SCDB" +
            "&KuaKuCodes=CJFQ%2CCCND%2CCIPD%2CCDMD%2CCYFD%2CBDZK%2CSCOD%2CCISD%2CSNAD%2CCCJD%2CGXDB_SECTION%2CCJFN" +
            "&CurPage=1&RecordsCntPerPage=20&CurDisplayMode=listmode" +
            "&CurrSortField=&CurrSortFieldType=desc&IsSentenceSearch=false&Subject=";
        return postData;
    }.bind(Zotero.Jasminum);


    this.selectRow = function (rowSelectors) {
        Zotero.debug("**Jasminum select window start");
        var io = { dataIn: rowSelectors, dataOut: null };
        var newDialog = window.openDialog(
            "chrome://zotero/content/ingester/selectitems.xul",
            "_blank",
            "chrome,modal,centerscreen,resizable=yes",
            io
        );
        return io.dataOut;
    }.bind(Zotero.Jasminum);


    this.getIDFromUrl = function (url) {
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
    }.bind(Zotero.Jasminum);


    this.search = async function (fileData) {
        Zotero.debug("**Jasminum start search");
        var postData = this.Scrape.createPostData(fileData);
        var requestHeaders = {
            Accept: "text/html, */*; q=0.01",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7",
            Connection: "keep-alive",
            "Content-Length": "2085",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Host: "kns.cnki.net",
            Origin: "https://kns.cnki.net",
            Referer:
                "https://kns.cnki.net/kns8/AdvSearch?dbprefix=SCDB&&crossDbcodes=CJFQ%2CCDMD%2CCIPD%2CCCND%2CCISD%2CSNAD%2CBDZK%2CCJFN%2CCCJD",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "X-Requested-With": "XMLHttpRequest",
        };
        var postUrl = "https://kns.cnki.net/KNS8/Brief/GetGridTableHtml";
        if (!this.CookieSandbox) {
            this.Scrape.setCookieSandbox();
        }
        // Zotero.debug(Zotero.Jasminum.CookieSandbox);
        var resp = await Zotero.HTTP.request("POST", postUrl, {
            headers: requestHeaders,
            cookieSandbox: this.CookieSandbox,
            body: postData,
        });
        // Zotero.debug(resp.responseText);
        var targetRows = this.Scrape.getItemFromSearch(resp.responseText);
        return targetRows;
    }.bind(Zotero.Jasminum);


    this.getItemFromSearch = function (resptext) {
        Zotero.debug("**Jasminum get item from search");
        var html = this.Utils.string2HTML(resptext);
        var rows = html.querySelectorAll(
            "table.result-table-list > tbody > tr"
        );
        Zotero.debug("**Jasminum 搜索结果：" + rows.length);
        var targetRows = [];
        if (!rows.length) {
            Zotero.debug("**Jasminum No items found.");
            return null;
        } else if (rows.length == 1) {
            targetRows.push(rows[0]);
            Zotero.debug(rows[0].textContent.split(/\s+/).join(" "));
        } else {
            // Get the right item from search result.
            var rowIndicators = {};
            for (let idx = 0; idx < rows.length; idx++) {
                var rowText = rows[idx].textContent.split(/\s+/).join(" ");
                rowIndicators[idx] = rowText;
                Zotero.debug(rowText);
            }
            var targetIndicator = this.Scrape.selectRow(rowIndicators);
            // Zotero.debug(targetIndicator);
            // No item selected, return null
            if (!targetIndicator) return null;
            Object.keys(targetIndicator).forEach(function (i) {
                targetRows.push(rows[i]);
            });
        }
        // Zotero.debug(targetRow.textContent);
        return targetRows;
    }.bind(Zotero.Jasminum);


    // Get CNKI citations from targetRow
    this.getCitationFromSearch = function (targetRow) {
        // Citation in web page or search table row
        var cite_page = Zotero.Utilities.xpath(targetRow, "//em[text()= '被引频次']/parent::span/text()");
        var cite_search = targetRow.getElementsByClassName("quote")[0].innerText.trim();
        return cite_page[0] ? cite_page.length > 0 : cite_search;
    }.bind(Zotero.Jasminum);

    /**
     * Get Citation number from article page
     * @param {document} 
     * @return {string} Citation number
     */
    this.getCitationFromPage = function (html) {
        let citenode = html.querySelector("input#paramcitingtimes");
        if (citenode) {
            return citenode.getAttribute('value');
        } else {
            return null;
        }
    }.bind(Zotero.Jasminum);

    /**
     * Get Chinese Social Science Citation Information
     * @param {document}
     * @return {string} 
     */
    this.getCSSCI = function (html) {
        var cssci = html.querySelectorAll("a.type");
        if (cssci.length > 0) {
            return Array.prototype.map.call(cssci, ele => ele.innerText).join(", ");
        } else {
            return null;
        }
    }.bind(Zotero.Jasminum);

    /**
     * Retrive reference text by post article ids
     * @param {String} 
     * @return {String}
     */
    this.getRefText = async function (postData) {
        let url = "https://kns.cnki.net/KNS8/manage/ShowExport";
        if (!this.RefCookieSandbox) {
            this.Scrape.setRefCookieSandbox();
        }
        var resp = await Zotero.HTTP.request("POST", url, {
            cookieSandbox: this.RefCookieSandbox,
            body: postData,
        });
        return resp.responseText
            .replace("<ul class='literature-list'><li>", "")
            .replace("<br></li></ul>", "")
            .replace("</li><li>", "") // divide results
            .replace(/<br>|\r/g, "\n")
            .replace(/vo (\d+)\n/, "VO $1\n") // Divide VO and IS to different line
            .replace(/\n+/g, "\n")
            .replace(/\n([A-Z][A-Z1-9]\s)/g, "<br>$1")
            .replace(/\n/g, "")
            .replace(/<br>/g, "\n")
            .replace(/\t/g, "") // \t in abstract
            .replace(
                /^RT\s+Conference Proceeding/gim,
                "RT Conference Proceedings"
            )
            .replace(/^RT\s+Dissertation\/Thesis/gim, "RT Dissertation")
            .replace(/^(A[1-4]|U2)\s*([^\r\n]+)/gm, function (m, tag, authors) {
                authors = authors.split(/\s*[;，,]\s*/); // that's a special comma
                if (!authors[authors.length - 1].trim()) authors.pop();
                return tag + " " + authors.join("\n" + tag + " ");
            })
            .trim();
    }.bind(Zotero.Jasminum);

    // Get refwork data from search target rows
    this.getRefworks = async function (targetRows) {
        Zotero.debug("**Jasminum start get ref");
        if (targetRows == null) {
            return new Error("No items returned from the CNKI");
        }
        var targetData = { targetUrls: [], citations: [] }, // url, citation
            targetIDs = [];
        targetRows.forEach(function (r) {
            var url = r.getElementsByClassName("fz14")[0].getAttribute("href");
            var cite = Zotero.Jasminum.Scrape.getCitationFromSearch(r);
            targetIDs.push(Zotero.Jasminum.Scrape.getIDFromUrl(url));
            targetData.citations.push(cite);
        });
        Zotero.debug(targetIDs);
        for (let idx = 0; idx < targetIDs.length; idx++) {
            targetData.targetUrls.push(
                `https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=${targetIDs[idx].dbcode}&dbname=${targetIDs[idx].dbname}&filename=${targetIDs[idx].filename}&v=`
            );
        }
        postData = this.Scrape.createRefPostData(targetIDs);
        Zotero.debug(postData);
        var data = await this.Scrape.getRefText(postData);
        Zotero.debug(data.split("\n"));
        return [data, targetData];
    }.bind(Zotero.Jasminum);

    //########################
    // For Adding bookmark
    //########################

    this.getReaderUrl = function (itemUrl) {
        Zotero.debug("** Jasminum get Reader url.");
        var itemid = this.Scrape.getIDFromUrl(itemUrl);
        var readerUrl =
            "https://kreader.cnki.net/Kreader/CatalogViewPage.aspx?dbCode=" +
            itemid.dbcode +
            "&filename=" +
            itemid.filename +
            "&tablename=" +
            itemid.dbname +
            "&compose=&first=1&uid=";
        return readerUrl;
    }.bind(Zotero.Jasminum);

    this.getChapterUrl = async function (readerUrl) {
        var reader = await Zotero.HTTP.request("GET", readerUrl);
        var readerHTML = this.Utils.string2HTML(reader.responseText);
        return (
            "https://kreader.cnki.net/Kreader/" +
            readerHTML.querySelector("iframe").getAttribute("src")
        );
    }.bind(Zotero.Jasminum);

    this.getChapterText = async function (chapterUrl, item) {
        var key = item.key;
        var lib = item.libraryID;
        var chapter = await Zotero.HTTP.request("GET", chapterUrl);
        var chapterHTML = this.Utils.string2HTML(
            chapter.responseText
        );
        var tree = chapterHTML.getElementById("treeDiv");
        var rows = tree.querySelectorAll("tr");
        var rows_array = [];
        var note = "";
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
            note += `<li style="padding-top: ${level == 1 ? 4 : 8
                }px; padding-left: ${12 * (level - 1)
                }px"><a href="zotero://open-pdf/${lib}_${key}/${page}">${title}</a></li>\n`;
        }
        note =
            '<p id="title"><strong>Contents</strong></p>\n' +
            '<ul id="toc" style="list-style-type: none; padding-left: 0px">\n' +
            note +
            "</ul>";
        return [rows_array.join("\n"), note];
    }.bind(Zotero.Jasminum);

    // Find chapter page number from CNKI reader side bar.
    this.getBookmark = async function (item) {
        // demo url     https://kreader.cnki.net/Kreader/buildTree.aspx?dbCode=cdmd&FileName=1020622678.nh&TableName=CMFDTEMP&sourceCode=GHSFU&date=&year=2020&period=&fileNameList=&compose=&subscribe=&titleName=&columnCode=&previousType=_&uid=
        var parentItem = item.parentItem;
        var itemUrl = "";
        var itemReaderUrl = "";
        var itemChapterUrl = "";
        if (
            // 匹配知网 URL
            parentItem.getField("url") &&
            parentItem.getField("url").match(/^https?:\/\/kns\.cnki\.net/) &&// Except nxgp.cnki.net
            this.Scrape.getIDFromUrl(parentItem.getField("url")) // A valid ID
        ) {
            Zotero.debug("** Jasminum item url exists");
            itemUrl = parentItem.getField("url");
        } else {
            Zotero.debug("Jasminum search for item url");
            var fileData = {
                keyword: parentItem.getField("title"),
                author:
                    parentItem.getCreator(0).lastName +
                    parentItem.getCreator(0).firstName,
            };
            var targetRows = await this.Scrape.search(fileData);
            if (targetRows.length === 0) {
                return null;
            }
            // Frist row in search table is selected.
            itemUrl = targetRows[0].querySelector("a.fz14").getAttribute("href");
            itemUrl = "https://kns.cnki.net/KCMS" + itemUrl.slice(4);
            // 获取文献链接URL -> 获取章节目录URL
        }
        Zotero.debug("** Jasminum item url: " + itemUrl);
        itemReaderUrl = this.Scrape.getReaderUrl(itemUrl);
        Zotero.debug("** Jasminum item reader url: " + itemReaderUrl);
        itemChapterUrl = await this.Scrape.getChapterUrl(itemReaderUrl);
        Zotero.debug("** Jasminum item chapter url: " + itemChapterUrl);
        // Next line raises: Invalid chrome URI: /
        var out = this.Scrape.getChapterText(itemChapterUrl, item);
        return out;
    }.bind(Zotero.Jasminum);


    this.addBookmark = async function (item, bookmark) {
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
        await OS.File.writeAtomic(cacheFile.path, array, {
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
            await OS.File.copy(cachePDF.path, item.getFilePath());
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
            this.Utils.showPopup(
                "Error in adding bookmark",
                `PDFtk 添加书签时失败, ${e}`,
                true
            )
        }
    }.bind(Zotero.Jasminum);

    this.checkPath = async function () {
        Zotero.debug("** Jasminum check path.");
        var pdftkpath = Zotero.Prefs.get("jasminum.pdftkpath");
        Zotero.debug(pdftkpath);
        var pdftk = "";
        if (Zotero.isWin) {
            pdftk = OS.Path.join(pdftkpath, "pdftk.exe");
        } else {
            pdftk = OS.Path.join(pdftkpath, "pdftk");
        }
        Zotero.debug(pdftk);
        var fileExist = await OS.File.exists(pdftk);
        Zotero.debug(fileExist);
        return fileExist;
    }.bind(Zotero.Jasminum);
}