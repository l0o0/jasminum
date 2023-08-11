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
      const cookieData =
          "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
          "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
          "_pk_ref=%5B%22%22%2C%22%22%2C1604497317%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
          "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
          "SID_kns8=123121; " +
          "Ecp_IpLoginFail=20110839.182.10.65";
      return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
  }

  setAttachmentCookieBox() {
      const cookieData = Zotero.Prefs.get("jasminum.cnki.attachment.cookie") as string;
      return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
  }

  setRefCookieSandbox() {
      const cookieData =
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
      return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
  };

  // Update cookiebox when attachment old cookie is outdated.
  updateAttachmentCookieBox() {
      this.attachmentCookieBox = this.setAttachmentCookieBox();
  }
}