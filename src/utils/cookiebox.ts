import { getPref } from "./prefs";
import { generateUUID } from "./tools";


export class MyCookieSandbox {
  public searchCookieBox: any;
  public attachmentCookieBox: any;
  public refCookieBox: any;
  userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
  baseUrl = "https://cnki.net/";

  constructor() {
    this.searchCookieBox = this.setSearchCookieBox();
    this.attachmentCookieBox = this.setAttachmentCookieBox();
    this.refCookieBox = this.setRefCookieSandbox();
  }

  setSearchCookieBox() {
    function createEcpId() {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始，需要加 1
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

      // 生成随机数作为最后几位
      const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const createTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      const ecpid = `i${year.slice(-2)}${month}${day}${hours}${minutes}${seconds}${milliseconds}${randomPart}`
      return [createTime, ecpid];
    }
    const [createTime, ecpid] = createEcpId();
    const cookieData =
      `cnkiUserKey=${generateUUID()}; ` +
      "dblang=both; " +
      `createtime-advInput=${createTime.replace(" ", "%20").replace(/:/g, "%3A")}; ` +
      `Ecp_ClientId=${ecpid}; ` +
      "SID_sug=zcw1abnl5vitqcliiq5almmj; "
    //Zotero.debug(cookieData);
    return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
  }

  setAttachmentCookieBox() {
    const cookieData = getPref("cnkiAttachmentCookie") as string;
    return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
  }

  setRefCookieSandbox() {
    const cookieData =
      `cnkiUserKey=${generateUUID()}; ` +
      `createtime-advInput=${(new Date()).toISOString().replace('T', ' ').slice(0, 19)}; ` +
      "dblang=both; " +
      "SID_restapi=018105; " +
      "SID_sug=018110";
    Zotero.debug(cookieData);
    return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
  };

  // Update cookiebox when attachment old cookie is outdated.
  updateAttachmentCookieBox() {
    this.attachmentCookieBox = this.setAttachmentCookieBox();
  }
}