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

// Detect user is in mainland China.
// Except 中国台湾，中国香港，中国澳门
async function isMainlandChina(): Promise<boolean> {
  const mainlandChina = [
    "浙江省",
    "江苏省",
    "广东省",
    "山东省",
    "河南省",
    "四川省",
    "湖北省",
    "河北省",
    "湖南省",
    "安徽省",
    "辽宁省",
    "福建省",
    "陕西省",
    "黑龙江省",
    "吉林省",
    "山西省",
    "江西省",
    "云南省",
    "贵州省",
    "内蒙古自治区",
    "广西壮族自治区",
    "西藏自治区",
    "宁夏回族自治区",
    "新疆维吾尔自治区",
    "北京市",
    "天津市",
    "上海市",
    "重庆市",
  ];
  const html = await requestDocument("https://ip.chinaz.com/", {
    method: "GET",
  });
  const targets = Zotero.Utilities.xpath(
    html,
    "//div[contains(text(), '您的本机IP地址')]",
  );
  if (targets.length > 0) {
    const targetContent = targets[0].textContent;
    return mainlandChina.some((p) => targetContent?.includes("归属地：" + p));
  }
  return true;
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

export {
  requestDocument,
  jsonToFormUrlEncoded,
  isMainlandChina,
  DocTools,
  text2HTMLDoc,
};
