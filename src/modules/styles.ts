import { getString } from "../utils/locale";
import { findWindow, observeWindowLoad, waitElmLoaded } from "../utils/window";

function injectToDocument(doc: Document) {
  const labelId = "zotero-chinese-styles-link";
  // Already injected
  if (doc.getElementById(labelId)) {
    ztoolkit.log("Chinese styles link already injected");
    return;
  }
  function injectToParent() {
    waitElmLoaded(doc, "#styleManager-buttons").then(() => {
      const label = doc.createElement("label");
      label.id = labelId;
      label.classList.add("zotero-text-link");
      label.setAttribute("is", "zotero-text-link");
      label.setAttribute("role", "link");
      label.textContent = getString("get-Chinese-styles");
      label.addEventListener("click", function (event) {
        Zotero.launchURL("https://zotero-chinese.com/styles/");
        event.preventDefault();
      });
      const firstLabel = doc.querySelector<HTMLElement>(
        "#styleManager-buttons > label:first-child",
      );
      if (!firstLabel) return;
      firstLabel.removeAttribute("flex");
      firstLabel.style.marginRight = "12px";
      firstLabel.insertAdjacentElement("afterend", label);
    });
  }
  const isCitePaneSelected = doc.querySelector(
    "richlistitem[value='zotero-prefpane-cite'][selected='true']",
  );
  // If cite pane is selected, insert immediately
  if (isCitePaneSelected) {
    injectToParent();
  } else {
    const navigation = doc.getElementById("prefs-navigation");
    if (!navigation) return;
    function onSelect(event: Event) {
      // Inject link only one time in window lifetime
      navigation!.removeEventListener("select", onSelect);
      injectToParent();
    }
    navigation.addEventListener("select", onSelect);
  }
}

/**
 * Inject a link to the Chinese styles page into the preferences window.
 */
export async function injectStylesLink() {
  const prefsUri = "chrome://zotero/content/preferences/preferences.xhtml";
  const existingWindow = findWindow(prefsUri);
  if (existingWindow) {
    injectToDocument(existingWindow.document);
  }
  // Wait for preference window loaded next time
  observeWindowLoad(prefsUri, (win) => injectToDocument(win.document));
}
