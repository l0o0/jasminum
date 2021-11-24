// Add click event for label element
init = function () {
    var box = document.getElementById("updateBox");
    box.addEventListener(
        "click",
        function (event) {
            var target = event.target;
            if (target.localName == 'label') {
                Zotero.debug(target.value)
            }
            if (!target)
                return;
        },
        false);
};
