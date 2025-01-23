function jsonToFormUrlEncoded(json: any) {
  return Object.keys(json)
    .map(
      (key) =>
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(
          typeof json[key] === "object" ? JSON.stringify(json[key]) : json[key],
        ),
    )
    .join("&");
}

async function requestDocument(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: any;
    responseType?: string;
    responseCharset?: string;
    successCodes?: number[] | false;
  },
): Promise<Document> {
  const xhr = await Zotero.HTTP.request(options?.method || "GET", url, {
    ...options,
    responseType: "document",
  });
  let doc = xhr.response;
  if (doc && !doc.location) {
    doc = Zotero.HTTP.wrapDocument(doc, xhr.responseURL);
  }
  return doc;
}

function text2HTMLDoc(text: string, url?: string): Document {
  let doc = new DOMParser().parseFromString(text, "text/html");
  if (url) {
    doc = Zotero.HTTP.wrapDocument(doc, url);
  }
  return doc;
}

/**
 * A simple HTML selector and attribute extractor.
 */
class DocTools {
  private node: Document | Element;
  constructor(node: Document | Element) {
    this.node = node;
  }
  attr(selector: string, attr: string, index?: number): string {
    const elm = this.choose(selector, index);
    return elm && elm.hasAttribute(attr) ? elm.getAttribute(attr)!.trim() : "";
  }
  text(selector: string, index?: number): string {
    const elm = this.choose(selector, index);
    return elm && elm.textContent ? elm.textContent!.trim() : "";
  }
  innerText(selector: string, index?: number): string {
    const elm = this.choose(selector, index);
    return elm && elm.textContent ? elm.textContent.trim() : "";
  }
  choose(selector: string, index?: number): Element | null {
    if (index === undefined) {
      return this.node.querySelector(selector);
    } else {
      const items = this.node.querySelectorAll(selector);
      if (index >= 0) {
        return items.item(index);
      } else {
        return items.item(items.length + index);
      }
    }
  }
}

export { requestDocument, jsonToFormUrlEncoded, DocTools, text2HTMLDoc };
