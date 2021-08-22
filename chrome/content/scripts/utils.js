Zotero.Jasminum.Utils = new function () {
    this.promiseTranslate = async function (translate, libraryID) {
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
            Zotero.debug(newItems);
            Zotero.debug("** Jasminum translate end.");
            return newItems;
        }
        throw new Error("No items found");
    }.bind(Zotero.Jasminum);


    this.fixItem = async function (newItems, targetData) {
        var creators;
        // 学位论文Thesis，导师 -> contributor
        for (let idx = 0; idx < newItems.length; idx++) {
            var newItem = newItems[idx];
            if (newItem.getNotes()) {
                if (Zotero.ItemTypes.getName(newItem.itemTypeID) == "thesis") {
                    creators = newItem.getCreators();
                    var note = Zotero.Items.get(newItem.getNotes()[0])
                        .getNote()
                        .split(/<br\s?\/>/);
                    // Zotero.debug(note);
                    for (let line of note) {
                        if (line.startsWith("A3")) {
                            var creator = {
                                firstName: "",
                                lastName: line.replace("A3 ", ""),
                                creatorType: "contributor",
                                fieldMode: true,
                            };
                            creators.push(creator);
                        }
                    }
                    newItem.setCreators(creators);
                }
                Zotero.Items.erase(newItem.getNotes());
            }
            // 是否处理中文姓名. For Chinese name
            if (Zotero.Prefs.get("jasminum.zhnamesplit")) {
                creators = newItem.getCreators();
                for (var i = 0; i < creators.length; i++) {
                    var creator = creators[i];
                    if (creator.firstName) continue;

                    var lastSpace = creator.lastName.lastIndexOf(" ");
                    if (
                        creator.lastName.search(/[A-Za-z]/) !== -1 &&
                        lastSpace !== -1
                    ) {
                        // western name. split on last space
                        creator.firstName = creator.lastName.substr(
                            0,
                            lastSpace
                        );
                        creator.lastName = creator.lastName.substr(
                            lastSpace + 1
                        );
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
            // Parse page content.
            var extraString = '';
            Zotero.debug("** Jasminum get article page.");
            var resp = await Zotero.HTTP.request("GET", targetData.targetUrls[idx]);
            var html = this.Utils.string2HTML(resp.responseText);
            // Full abstract note.
            if (newItem.getField("abstractNote").endsWith("...")) {
                var abs = html.querySelector("#ChDivSummary");
                Zotero.debug("** Jasminum abs " + abs.innerText);
                if (abs.innerText) {
                    newItem.setField("abstractNote", abs.innerText.trim());
                }
            }
            // Add DOI
            var doi = Zotero.Utilities.xpath(html, "//*[contains(text(), 'DOI')]/following-sibling::p");
            if ('DOI' in newItem && doi.length > 0) {  // Some items lack DOI field
                newItem.setField("DOI", doi[0].innerText);
            }

            // Remove wront CN field.
            newItem.setField("callNumber", "");
            if (Zotero.ItemTypes.getName(newItem.itemTypeID) != "patent") {
                newItem.setField("libraryCatalog", "CNKI");
            }
            newItem.setField("url", targetData.targetUrls[idx]);
            if (targetData.citations[idx]) {  // Add citation
                var dateString = new Date().toLocaleDateString().replace(/\//g, '-');
                var citationString = `${targetData.citations[idx]} citations(CNKI)[${dateString}]`;
                extraString = citationString;
            }

            // Add Article publisher type, surrounded by <>. 核心期刊
            var publisherType = Zotero.Utilities.xpath(html, "//div[@class='top-tip']//a[@class='type']");
            if (publisherType.length > 0) {
                extraString = extraString + "<" + publisherType.map(function (ele) {
                    return ele.innerText
                }
                ).join(", ")
                    + ">";
            }

            newItem.setField("extra", extraString);

            // Keep tags according global config.
            if (Zotero.Prefs.get("automaticTags") === false) {
                newItem.setTags([]);
            }
            // Change tag type
            var tags = newItem.getTags();
            // Zotero.debug('** Jasminum tags length: ' + tags.length);
            if (tags.length > 0) {
                var newTags = [];
                for (let tag of tags) {
                    tag.type = 1;
                    newTags.push(tag);
                }
                newItem.setTags(newTags);
            }
            newItems[idx] = newItem;
        }
        return newItems;
    }.bind(Zotero.Jasminum);


    this.string2HTML = function (text) {
        // Use DOMParser to parse text to HTML.
        // This DOMParser is from XPCOM.
        var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
            .createInstance(Components.interfaces.nsIDOMParser);
        return parser.parseFromString(text, "text/html");
    }.bind(Zotero.Jasminum);
}