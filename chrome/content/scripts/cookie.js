Components.utils.import("resource://gre/modules/Services.jsm");

function onLoad() {
    let _browser = document.getElementsByTagName('browser')[0];
    let browserUrl = document.getElementById("browser-url");
    browserUrl.addEventListener('keypress', function (e) {
        if (e.keyCode == e.DOM_VK_RETURN) {
            _browser.loadURIWithFlags(
                browserUrl.value,
                Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE
            );
        }
    });
}

function go() {
    let _browser = document.getElementsByTagName('browser')[0];
    let browserUrl = document.getElementById("browser-url");
    _browser.loadURIWithFlags(
        browserUrl.value,
        Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE
    );
}

function updateCookie() {
    let _browser = document.getElementsByTagName('browser')[0];
    let _doc = _browser.contentDocument;
    Zotero.Prefs.set("jasminum.cnki.attachment.cookie", _doc.cookie);
    return _doc.cookie;
}

window.addEventListener("load", function (e) { onLoad(); }, false);