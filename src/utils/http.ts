/**
 * Get Html content text from given url
 * @param {String} url
 * @returns {String}
 */
export async function getHTMLText(url: string) {
  const resp = await Zotero.HTTP.request("GET", url);
  if (resp.status != 200) {
    throw new Error(`Jasminum getHTMLText status ${resp.status}, ${url} `);
  }
  return resp.responseText;
}

export async function getHTMLDoc(url: string) {
  const responseText = await getHTMLText(url);
  return string2HTML(responseText);
}

export function string2HTML(text: string) {
  // Use DOMParser to parse text to HTML.
  // This DOMParser is from XPCOM.
  /*         var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
              .createInstance(Components.interfaces.nsIDOMParser); */
  const parser = new DOMParser();
  return parser.parseFromString(text, "text/html");
}
