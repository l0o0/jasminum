import { get } from "http";
import { getString } from "../utils/locale";
import { findWindow, observeWindowLoad, waitElmLoaded } from "../utils/window";
import { setDashPattern } from "pdf-lib";

function injectToDocument(doc: Document) {
  const labelId = "zotero-chinese-styles-link";
  // Already injected
  if (doc.getElementById(labelId)) {
    ztoolkit.log("Chinese styles link already injected");
    return;
  }
  function injectToParent() {
    // ztoolkit.log("Injecting Chinese styles link to preferences");
    waitElmLoaded(doc, "#styleManager-buttons", 8000).then(() => {
      //   ztoolkit.log("Preferences loaded, injecting link");
      const firstChild = doc.querySelector<HTMLElement>(
        "#styleManager-buttons > :nth-child(1)",
      );
      const secondChild = doc.querySelector<HTMLElement>(
        "#styleManager-buttons > :nth-child(2)",
      );
      //   ztoolkit.log(firstChild?.tagName);
      if (!firstChild || !secondChild) return;
      if (firstChild.tagName === "button") {
        const hbox_copy = secondChild
          .querySelector("hbox")!
          .cloneNode(true) as HTMLElement;
        hbox_copy
          .querySelector("label")!
          .setAttribute("value", getString("get-Chinese-styles"));
        const button = doc.createElement("button");
        button.style.padding = "0px";
        button.id = labelId;
        button.setAttribute("label", getString("get-Chinese-styles"));
        button.addEventListener("click", function (event) {
          Zotero.launchURL("https://zotero-chinese.com/styles/");
          event.preventDefault();
        });
        button.appendChild(hbox_copy);
        secondChild.insertAdjacentElement("beforebegin", button);
      } else if (firstChild.tagName === "label") {
        // For Zotero 7
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
        firstChild.removeAttribute("flex");
        firstChild.style.marginRight = "12px";
        firstChild.insertAdjacentElement("afterend", label);
      }
      ztoolkit.log("Chinese styles link injected");
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
